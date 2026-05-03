package com.alpaca.web.Service;

import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.Repository.OrderHistoryRepository;
import com.alpaca.web.Repository.StockAssetRepository;
import com.alpaca.web.dto.TradeExecutionRecord;
import com.alpaca.web.dto.UserAnalyticsResult;
import com.alpaca.web.entity.OrderHistory;
import com.alpaca.web.entity.StockAsset;
import com.alpaca.web.entity.UserAccount;
import io.github.cdimascio.dotenv.Dotenv;
import net.jacobpeterson.alpaca.AlpacaAPI;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import org.springframework.stereotype.Service;

@Service
public class UserAnalyticsService {
    private final OrderHistoryRepository orderRepository;
    private final StockAssetRepository stockAssetRepository;
    private AlpacaAPI brokerAPI;
    private final AccountRepository accountRepository;
    private final MarketDataService marketDataService;
    private final StockAnalysisService stockAnalysisService;
    private double totalRealizedPnL; // กำไร/ขาดทุนสุทธิรวม
    private double averageWinPct; // กำไรเฉลี่ยต่อไม้ (%)
    private double averageLossPct; // ขาดทุนเฉลี่ยต่อไม้ (%)
    private double riskRewardRatio; // สัดส่วน Risk:Reward (ควร > 1.0)
    private boolean isStyleMatched; // True = เล่นหุ้นถูกประเภทสายเทรด
    private boolean isProfitable; // True = ภาพรวมมีกำไร (Win Rate > 50 หรือ PnL > 0)

    Dotenv dotenv = Dotenv.load();

    public UserAnalyticsService(OrderHistoryRepository orderRepository, StockAssetRepository stockAssetRepository,
            AccountRepository accountRepository, MarketDataService marketDataService,
            StockAnalysisService stockAnalysisService) {
        this.orderRepository = orderRepository;
        this.stockAssetRepository = stockAssetRepository;
        this.accountRepository = accountRepository;
        this.marketDataService = marketDataService;
        this.stockAnalysisService = stockAnalysisService;
    }

    private static class RemainingOrder {
        OrderHistory order;
        BigDecimal remainingQty;

        public RemainingOrder(OrderHistory order, BigDecimal remainingQty) {
            this.order = order;
            this.remainingQty = remainingQty;
        }
    }

    public UserAnalyticsResult analyzeUserBehavior(Long userId) {

        // 1. ดึงข้อมูล User Account เพื่อเอา Trader Type เดิม (Stated Type)
        UserAccount user = accountRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String statedType = user.getTraderType() != null ? user.getTraderType() : "Unknown";

        // 2. ดึง Order ทั้งหมดและเรียงจาก เก่า -> ใหม่ (Ascending) เพื่อทำ FIFO
        List<OrderHistory> orders = orderRepository.findByUserAccount_IdOrderByFilledAtDesc(userId)
                .stream()
                .filter(o -> "filled".equalsIgnoreCase(o.getStatus()))
                .sorted(Comparator.comparing(OrderHistory::getFilledAt))
                .collect(Collectors.toList());

        if (orders.isEmpty()) {
            UserAnalyticsResult emptyResult = new UserAnalyticsResult();
            emptyResult.setTraderType(statedType);
            emptyResult.setPrimaryFeedback("ยังไม่มีข้อมูลการเทรดที่สมบูรณ์เพียงพอ");
            // ยังคงต้องเรียก analyzeRiskBehaviors เพื่อดึงค่า Quiz จาก DB มาโชว์
            analyzeRiskBehaviors(emptyResult, new ArrayList<>(), new ArrayList<>(), user.getRiskBehavior());
            return emptyResult;
        }

        List<TradeExecutionRecord> closedTrades = matchTradesFIFO(orders);

        String actualBehaviorType = classifyTraderType(closedTrades);

        // คำนวณ Analytics หลัก (Win Rate, PnL, R:R, Highlights)
        UserAnalyticsResult result = performDeepAnalytics(statedType, actualBehaviorType, closedTrades);

        // คำนวณ Advanced Metrics (Profit Factor, Streaks, Sizing, Diversification)
        calculateAdvancedMetrics(result, closedTrades);

        // วิเคราะห์ความเสี่ยง (FOMO, Panic, etc. — ส่งค่า riskBehavior จาก DB ไปด้วย)
        analyzeRiskBehaviors(result, closedTrades, orders, user.getRiskBehavior());

        // ★ สร้างคำแนะนำเชิงลึก — ต้องทำ "หลังสุด" เพราะ diagnoseLossReason() ต้องอ่านค่าจากทุก Module ข้างบน
        generateFinalRecommendation(result, statedType, actualBehaviorType, closedTrades);

        return result;
    }

    // ==========================================
    // ส่วนที่ 1: การจับคู่ประวัติการเทรดแบบ FIFO
    // ==========================================
    private List<TradeExecutionRecord> matchTradesFIFO(List<OrderHistory> orders) {
        List<TradeExecutionRecord> closedTrades = new ArrayList<>();

        // จัดกลุ่มตาม Symbol
        Map<String, List<OrderHistory>> ordersBySymbol = orders.stream()
                .collect(Collectors.groupingBy(OrderHistory::getSymbol));

        for (Map.Entry<String, List<OrderHistory>> entry : ordersBySymbol.entrySet()) {
            String symbol = entry.getKey();
            LinkedList<RemainingOrder> longQueue = new LinkedList<>(); // เก็บไม้ Buy ที่รอขาย
            LinkedList<RemainingOrder> shortQueue = new LinkedList<>(); // เก็บไม้ Sell (Short) ที่รอซื้อคืน
            String stockCategory = fetchStockCategorySafely(symbol);

            for (OrderHistory currentOrder : entry.getValue()) {
                BigDecimal qtyToMatch = currentOrder.getFilledQty();
                if ("buy".equalsIgnoreCase(currentOrder.getSide())) {
                    // Buy แมทช์กับ Short Queue
                    while (qtyToMatch.compareTo(BigDecimal.ZERO) > 0 && !shortQueue.isEmpty()) {
                        RemainingOrder openShort = shortQueue.peek();
                        BigDecimal matchedQty = qtyToMatch.min(openShort.remainingQty);
                        closedTrades.add(createTradeRecord(openShort.order, currentOrder, matchedQty, stockCategory));

                        qtyToMatch = qtyToMatch.subtract(matchedQty);
                        openShort.remainingQty = openShort.remainingQty.subtract(matchedQty);

                        if (openShort.remainingQty.compareTo(BigDecimal.ZERO) == 0)
                            shortQueue.poll();
                    }
                    // ถ้าเหลือ ให้เข้าคิว Long
                    if (qtyToMatch.compareTo(BigDecimal.ZERO) > 0) {
                        // ห้าม setFilledQty!! ให้ส่ง qtyToMatch เข้าไปตรงๆ
                        longQueue.add(new RemainingOrder(currentOrder, qtyToMatch));
                    }

                } else if ("sell".equalsIgnoreCase(currentOrder.getSide())) {
                    // Sell แมทช์กับ Long Queue
                    while (qtyToMatch.compareTo(BigDecimal.ZERO) > 0 && !longQueue.isEmpty()) {
                        RemainingOrder openLong = longQueue.peek();
                        BigDecimal matchedQty = qtyToMatch.min(openLong.remainingQty);
                        closedTrades.add(createTradeRecord(openLong.order, currentOrder, matchedQty, stockCategory));

                        qtyToMatch = qtyToMatch.subtract(matchedQty);
                        openLong.remainingQty = openLong.remainingQty.subtract(matchedQty);

                        if (openLong.remainingQty.compareTo(BigDecimal.ZERO) == 0)
                            longQueue.poll();
                    }
                    // ถ้าเหลือ ให้เข้าคิว Short
                    if (qtyToMatch.compareTo(BigDecimal.ZERO) > 0) {
                        // ห้าม setFilledQty!! และต้องแก้เป็น shortQueue
                        shortQueue.add(new RemainingOrder(currentOrder, qtyToMatch)); // แก้จาก longQueue เป็น
                                                                                      // shortQueue
                    }
                }
            }
        }
        return closedTrades;
    }

    // ==========================================
    // ส่วนที่ 2: วิเคราะห์แยกประภทนักเทรด Advanced Trader Classification (Time + Asset Context)
    // ==========================================
    private String classifyTraderType(List<TradeExecutionRecord> trades) {
        if (trades.isEmpty()) return "Unknown";

        int scalperBehavior = 0;
        int dayTraderBehavior = 0;
        int swingBehavior = 0;
        int positionBehavior = 0;

        for (TradeExecutionRecord t : trades) {
            long seconds = t.getHoldingPeriod().getSeconds();

            // ใช้แค่ Timeframe และ Over-night เป็นตัวตัดเกรดหลัก
            if (seconds <= 1800) {
                scalperBehavior++; // ไม่เกิน 30 นาที = Scalper
            } else if (seconds <= 43200 && !t.isOvernight()) {
                dayTraderBehavior++; // จบในวัน ไม่ห่อข้ามคืน = Day Trader
            } else if (seconds <= 1814400) {
                swingBehavior++; // ถือข้ามคืน ถึง 3 สัปดาห์ = Swing Trader
            } else {
                positionBehavior++; // ถือยาวกว่า 3 สัปดาห์ = Position Trader
            }
        }

        // หา Max Score เพื่อระบุ Type หลัก (เหลือแค่ 4 สาย)
        return determineDominantStyle(scalperBehavior, dayTraderBehavior, swingBehavior, positionBehavior);
    }
    private String determineDominantStyle(int scalp, int day, int swing, int pos) {
        int max = Math.max(Math.max(scalp, day), Math.max(swing, pos));
        if (max == 0) return "Unknown";

        if (max == scalp) return "Scalper";
        if (max == day) return "Day Trader";
        if (max == swing) return "Swing Trader";
        return "Position Trader";
    }

    private String checkBadHabits(List<TradeExecutionRecord> trades, String actualType) {
        int bagHolderCount = 0;
        int noiseCount = 0;

        for (TradeExecutionRecord t : trades) {
            long seconds = t.getHoldingPeriod().getSeconds();
            String category = t.getCategory() != null ? t.getCategory().toUpperCase() : "UNKNOWN";

            // นิยาม Bag Holder: ถือหุ้นซิ่ง (Speculative) นานเกิน 3 สัปดาห์ และขาดทุน
            if (seconds > 1814400 && (category.contains("SPECULATIVE") || category.contains("เก็งกำไร"))) {
                if (t.getRealizedProfitPercentage().compareTo(BigDecimal.ZERO) < 0) {
                    bagHolderCount++;
                }
            }

            // นิยาม Noise Trader: ถือหุ้นนิ่งๆ (Stable) สั้นมากต่ำกว่า 30 นาที
            if (seconds <= 1800 && (category.contains("STABLE") || category.contains("มั่นคง"))) {
                noiseCount++;
            }
        }

        List<String> warnings = new ArrayList<>();
        if (bagHolderCount >= 2) {
            warnings.add("⚠️ ตรวจพบพฤติกรรม 'นักสะสมดอย' (ถือหุ้นเก็งกำไรที่ขาดทุนไว้นานเกินไป)");
        }
        if (noiseCount >= 3) {
            warnings.add("⚠️ ตรวจพบพฤติกรรม 'Overtrading / Noise' (ซื้อขายหุ้นที่วิ่งช้าบ่อยเกินไปจนเสียค่าธรรมเนียมฟรี)");
        }

        return warnings.isEmpty() ? "" : "\n" + String.join("\n", warnings);
    }
//    // Helper methods
//
//    private boolean isVolatileStock(String category) {
//        if (category == null) return false;
//        String c = category.toUpperCase();
//        return c.contains("SPECULATIVE") || c.contains("เก็งกำไร") || c.contains("HIGH_VOLATILITY");
//    }
//
//    private boolean isTrendingOrCyclical(String category) {
//        if (category == null) return false;
//        String c = category.toUpperCase();
//        return c.contains("TRENDING") || c.contains("กระแส") ||
//                c.contains("SWING") || c.contains("เล่นรอบ");
//    }



    // ==========================================
    // ส่วนที่ 3: กฎประเมินความเหมาะสม (Rule Engine)
    // ==========================================
    private UserAnalyticsResult evaluateSuitability(String traderType, List<TradeExecutionRecord> trades) {
        UserAnalyticsResult result = new UserAnalyticsResult();
        result.setTraderType(traderType);
        result.setTotalClosedTrades(trades.size());

        if (trades.isEmpty())
            return result;

        long winningTrades = trades.stream().filter(t -> t.getRealizedProfitPercentage().compareTo(BigDecimal.ZERO) > 0)
                .count();
        double winRate = ((double) winningTrades / trades.size()) * 100;
        result.setWinRate(winRate);

        // หาว่าส่วนใหญ่เล่นหุ้น Category ไหน
        Map<String, Long> categoryCount = trades.stream()
                .collect(Collectors.groupingBy(TradeExecutionRecord::getCategory, Collectors.counting()));
        String predominantCategory = categoryCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("UNKNOWN");

        boolean isStyleMatched = checkStyleMatch(traderType, predominantCategory);
        boolean isProfitable = winRate >= 50.0; // สมมติ Win Rate > 50% ถือว่ารอด

        // --- Core Logic ของ Feedback (แก้ไขและขยายได้ที่นี่) ---
        if (isStyleMatched && isProfitable) {
            result.setPrimaryFeedback("เยี่ยมมาก! คุณมาถูกทางแล้ว (Right Path)");
            result.setRecommendation(String.format("สไตล์ %s ของคุณเข้ากันได้ดีกับหุ้นกลุ่ม %s จงรักษาวินัยแบบนี้ต่อไป",
                    traderType, predominantCategory));
        } else if (isStyleMatched && !isProfitable) {
            result.setPrimaryFeedback(
                    "คุณเลือกหุ้นตรงสาย แต่จังหวะเข้าออกยังต้องปรับปรุง (Right Category, Wrong Timing)");
            result.setRecommendation(String.format(
                    "คุณเล่นหุ้น %s ซึ่งเหมาะกับ %s แล้ว แต่ผลประกอบการยังติดลบ แนะนำให้ฝึกฝนจุด Cut-loss และ Take-profit เพิ่มเติม",
                    predominantCategory, traderType));
        } else if (!isStyleMatched && isProfitable) {
            result.setPrimaryFeedback(
                    "คุณได้กำไร แต่อาจจะเสี่ยงหรือเป็นเรื่องโชค (Profitable but High Risk of Style Drift)");
            result.setRecommendation(String.format(
                    "คุณสไตล์ %s แต่ไปเล่นหุ้น %s ซึ่งผิดธรรมชาติ แม้จะได้กำไรแต่ระยะยาวอาจอันตราย ลองพิจารณาเปลี่ยนไปเล่นหุ้นกลุ่มที่ตรงกับรอบเวลาของคุณ",
                    traderType, predominantCategory));
        } else {
            result.setPrimaryFeedback("สไตล์การเทรดและประเภทหุ้นขัดแย้งกันอย่างรุนแรง (Wrong Style, Wrong Category)");
            String suggestCat = getSuggestedCategory(traderType);
            result.setRecommendation(String.format(
                    "การขาดทุนเกิดจากคุณมีพฤติกรรม %s แต่ไปฝืนเล่นหุ้น %s แนะนำให้เปลี่ยนไปศึกษาหุ้นกลุ่ม %s แทน",
                    traderType, predominantCategory, suggestCat));
        }

        return result;
    }

    // ตรวจสอบว่า สไตล์การเทรด เข้ากับ หุ้นที่เทรดไหม
    private boolean checkStyleMatch(String traderType, String category) {
        if (category == null)
            return false;
        String cat = category.toUpperCase();
        return switch (traderType) {
            case "Scalper" ->
                cat.contains("SPECULATIVE") || cat.contains("เก็งกำไร") || cat.contains("HIGH_VOLATILITY");
            case "Day Trader" -> cat.contains("TRENDING") || cat.contains("กระแส") || cat.contains("SPECULATIVE")
                    || cat.contains("เก็งกำไร")|| cat.contains("SWING") || cat.contains("เล่นรอบ");
            case "Swing Trader" ->
                cat.contains("SWING") || cat.contains("เล่นรอบ") || cat.contains("TRENDING") || cat.contains("กระแส");
            case "Position Trader" -> cat.contains("STABLE") || cat.contains("มั่นคง") || cat.contains("BLUECHIP")
                    || cat.contains("DIVIDEND") || cat.contains("TRENDING") || cat.contains("กระแส");
            default -> false;
        };
    }

    // แนะนำกลุ่มหุ้นที่ถูกต้องเมื่อเล่นผิดสาย
    private String getSuggestedCategory(String traderType) {
        return switch (traderType) {
            case "Scalper", "Day Trader" -> "กระแส (Trending) หรือ เก็งกำไร (Speculative)";
            case "Swing Trader" -> "เล่นรอบ (Swing)";
            case "Position Trader" -> "มั่นคง (Stable)";
            default -> "ไม่มีคำแนะนำ";
        };
    }

    private UserAnalyticsResult performDeepAnalytics(String statedType, String actualBehaviorType,
            List<TradeExecutionRecord> trades) {
        UserAnalyticsResult result = new UserAnalyticsResult();
        result.setTraderType(statedType); // ยึดตามที่ User เลือกไว้ก่อน
        result.setTotalClosedTrades(trades.size());

        if (trades.isEmpty())
            return result;

        // --- 1. คำนวณ Performance Metrics ---
        int winCount = 0;
        int lossCount = 0;
        double sumWinPct = 0.0;
        double sumLossPct = 0.0;
        BigDecimal totalPnLAmount = BigDecimal.ZERO;
        for (TradeExecutionRecord t : trades) {
            BigDecimal pnlAmt = t.getRealizedProfitAmount();
            double pnlPct = t.getRealizedProfitPercentage().doubleValue();

            totalPnLAmount = totalPnLAmount.add(pnlAmt); // รวมยอดเงินจริง

            if (pnlAmt.compareTo(BigDecimal.ZERO) > 0) {
                winCount++;
                sumWinPct += pnlPct;
            } else if (pnlAmt.compareTo(BigDecimal.ZERO) < 0) {
                lossCount++;
                sumLossPct += Math.abs(pnlPct);
            }
        }

        double winRate = ((double) winCount / trades.size()) * 100;
        double avgWin = winCount > 0 ? sumWinPct / winCount : 0.0;
        double avgLoss = lossCount > 0 ? sumLossPct / lossCount : 0.0;
        double riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin;
  ///
        // คำนวณ Highlights (หุ้นตัวโปรด, หุ้นทำเงิน)
        calculateHighlights(result, trades);

        result.setWinRate(winRate);
        result.setTotalRealizedPnL(totalPnLAmount.doubleValue()); // Set ค่าจริงที่เป็นตัวเงิน
        result.setAverageWinPct(avgWin);
        result.setAverageLossPct(avgLoss);
        result.setRiskRewardRatio(riskReward);

        // Logic check match
        Map<String, Long> categoryCount = trades.stream()
                .collect(Collectors.groupingBy(TradeExecutionRecord::getCategory, Collectors.counting()));
        String predominantCategory = categoryCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("UNKNOWN");

        boolean isStockMatched = checkStyleMatch(statedType, predominantCategory);
        boolean isBehaviorMatched = statedType.equalsIgnoreCase(actualBehaviorType);
        boolean isProfitable = (totalPnLAmount.compareTo(BigDecimal.ZERO) > 0) || (winRate > 50.0);

        result.setStyleMatched(isStockMatched && isBehaviorMatched);
        result.setProfitable(isProfitable);

        // ★ ไม่สร้างคำแนะนำที่นี่แล้ว — ย้ายไปทำใน generateFinalRecommendation() หลังคำนวณ Metrics ทุกตัวเสร็จ
        return result;

    }

    // ★ Orchestrator Method: สร้างคำแนะนำหลังจาก Metrics ทุกตัวถูกคำนวณเสร็จแล้ว
    // เรียกใช้ generateDetailedRecommendation (ซึ่งภายในจะเรียก diagnoseLossReason, findSimilarStocks ฯลฯ)
    // ตอนนี้ diagnoseLossReason() จะอ่านค่า profitFactor, maxConsecutiveLosses, fomoStatus ฯลฯ ได้ถูกต้อง
    private void generateFinalRecommendation(UserAnalyticsResult result, String statedType,
            String actualBehaviorType, List<TradeExecutionRecord> closedTrades) {
        if (closedTrades.isEmpty()) return;

        // คำนวณ predominant category ใหม่ (เหมือนที่เคยทำใน performDeepAnalytics)
        Map<String, Long> categoryCount = closedTrades.stream()
                .collect(Collectors.groupingBy(TradeExecutionRecord::getCategory, Collectors.counting()));
        String predominantCategory = categoryCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("UNKNOWN");

        boolean isStockMatched = checkStyleMatch(statedType, predominantCategory);
        boolean isBehaviorMatched = statedType.equalsIgnoreCase(actualBehaviorType);
        boolean isProfitable = result.isProfitable();

        // เรียก generateDetailedRecommendation (ภายในจะ branch ไป diagnoseLossReason, findSimilarStocks ฯลฯ)
        generateDetailedRecommendation(result, statedType, actualBehaviorType, predominantCategory,
                isStockMatched, isBehaviorMatched, isProfitable);

        // เพิ่มคำเตือน Bad Habits
        String badHabitWarnings = checkBadHabits(closedTrades, actualBehaviorType);
        if (!badHabitWarnings.isEmpty()) {
            String currentRec = result.getRecommendation();
            result.setRecommendation(currentRec + "\n\nคำเตือนเพิ่มเติม:" + badHabitWarnings);
        }
    }

    private void generateDetailedRecommendation(UserAnalyticsResult result, String statedType, String actualType,
            String stockCat, boolean stockMatch, boolean behaviorMatch, boolean profitable) {

        // นิยามคำว่า "ถูกสาย" (Alignment) : ต้องถูกทั้งตัวหุ้น และ พฤติกรรมการถือ
        boolean isRightStyle = stockMatch && behaviorMatch;
        if (isRightStyle) {
            // GROUP A: ถูกสาย (Aligned)
            if (profitable) {
                // 1. ถูกสาย - กำไร (Ideal State)
                handleRightStyleProfitable(result, statedType, stockCat);
            } else {
                // 3. ถูกสาย - ขาดทุน (Discipline Trap) -> *มี 2 ทางเลือก*
                handleRightStyleUnprofitable(result, statedType);
            }
        } else {
            // GROUP B: ผิดสาย (Misaligned) -> คือ stockMatch=false หรือ behaviorMatch=false
            if (profitable) {
                // 2. ผิดสาย - กำไร (Accidental Success/Discovery)
                handleWrongStyleProfitable(result, statedType, actualType, stockCat, stockMatch);
            } else {
                // 4. ผิดสาย - ขาดทุน (Total Chaos)
                handleWrongStyleUnprofitable(result, statedType, actualType, stockCat);
            }
        }

    }

    // 1. ถูกสาย - กำไร
    private void handleRightStyleProfitable(UserAnalyticsResult result, String statedType, String stockCat) {
        result.setPrimaryFeedback("ยอดเยี่ยม! คุณคือนักเทรดที่มีวินัย (Perfect Alignment)");
        // ดึงตัวหุ้นที่เหมาะสมหรือที่ได้กำไรมากสุดใน port
        String bestStock = result.getBestPerformingStock();
        String recommendationText = String.format(
                "คุณทำได้ตามแผน %s ทั้งการเลือกหุ้นกลุ่ม %s และระยะเวลาถือครอง จงรักษาวินัยนี้ไว้",
                statedType, stockCat);
        // ถ้ามีหุ้นทำเงินสูงสุด ให้ทำการหาหุ้นแนะนำ
        if (bestStock != null && !bestStock.equals("-")) {
            List<String> similarStocks = findSimilarStocks(bestStock, stockCat);

            if (!similarStocks.isEmpty()) {
                String suggestedSymbols = String.join(", ", similarStocks);
                recommendationText += String.format(
                        "\n\n💡 หุ้นที่คุณทำกำไรได้ดีที่สุดคือ %s ระบบขอแนะนำให้คุณลองศึกษาหุ้นในอุตสาหกรรมเดียวกันที่มีพฤติกรรมคล้ายกัน เช่น %s ดูเพิ่มเติม เพราะจริตของคุณเข้ากับหุ้นกลุ่มนี้มาก",
                        bestStock, suggestedSymbols);

                result.setRecommendedSimilarStocks(similarStocks);
            }
        } else {
            recommendationText += " และพยายาม Scale Up พอร์ตการลงทุน";
        }

        result.setRecommendation(recommendationText);
    }

    // 2. ถูกสาย - ขาดทุน (ไฮไลท์ที่คุณต้องการ: 2 ทางเลือก)
    private void handleRightStyleUnprofitable(UserAnalyticsResult result, String statedType) {
        result.setPrimaryFeedback("วินัยดีเยี่ยม แต่ผลลัพธ์ยังไม่ตอบโจทย์ (Discipline with Loss)");

        String baseRec = String.format(
                "คุณทำตามระบบ %s ได้เป๊ะมากแต่ยังขาดทุน ปัญหาน่าจะอยู่ที่ 'กลยุทธ์ย่อย' ไม่ใช่ 'วินัย'",
                statedType);

        // เรียกใช้การวินิจฉัยเชิงลึก
        String deepDiagnostic = diagnoseLossReason(result);

        // ★ แนะนำหุ้นที่เหมาะกับสายของ User แม้จะขาดทุน (ช่วยให้มีทิศทาง)
        String mostTraded = result.getMostTradedStock();
        List<String> suggestedStocks = new ArrayList<>();
        if (mostTraded != null && !mostTraded.equals("-")) {
            suggestedStocks = findSimilarStocks(mostTraded, null);
        }
        if (suggestedStocks.isEmpty()) {
            suggestedStocks = findStocksForTraderType(statedType);
        }
        if (!suggestedStocks.isEmpty()) {
            String symbols = String.join(", ", suggestedStocks);
            deepDiagnostic += String.format(
                    "\n\n📌 หุ้นที่แนะนำให้ศึกษาเพิ่มเติม: %s — เหมาะสำหรับสาย %s ลองศึกษากราฟและพื้นฐานก่อนเทรดจริง",
                    symbols, statedType);
            result.setRecommendedSimilarStocks(suggestedStocks);
        }

        result.setRecommendation(baseRec + deepDiagnostic);
    }

    // 3. ผิดสาย - กำไร  //เพิ่มชอบหุ้นแอบแฝงเข้าไปให้มี มิติขึ้น
    private void handleWrongStyleProfitable(UserAnalyticsResult result, String statedType, String actualType,
                                            String stockCat, boolean stockMatch) {
        result.setPrimaryFeedback("ค้นพบพรสวรรค์ใหม่? (New Strength Discovered)");

        StringBuilder rec = new StringBuilder();
        if (!stockMatch) {
            String suitableType = getTraderTypeFromCategory(stockCat);
            rec.append(String.format(
                    "คุณตั้งเป้าเป็น %s แต่กำไรครั้งนี้มาจากหุ้นกลุ่ม %s ซึ่งปกติเหมาะกับสาย %s มากกว่า\n",
                    statedType, stockCat, suitableType));
        } else {
            rec.append(String.format(
                    "หุ้นถูกตัวแล้ว แต่พฤติกรรมคุณคือ %s (ไม่ใช่ %s) แล้วได้กำไร แสดงว่าจริตของคุณอาจเหมาะกับสไตล์ใหม่นี้มากกว่า\n",
                    actualType, statedType));
        }

        // --- ส่วนที่เพิ่มเข้ามา: แนะนำหุ้นตามความชอบแอบแฝง ---
        String bestStock = result.getBestPerformingStock();
        if (bestStock != null && !bestStock.equals("-")) {
            List<String> similarStocks = findSimilarStocks(bestStock, stockCat);
            if (!similarStocks.isEmpty()) {
                String suggestedSymbols = String.join(", ", similarStocks);
                rec.append(String.format(
                        "\n จากความสำเร็จแบบไม่ได้ตั้งใจนี้ หุ้นทำเงินของคุณคือ %s เราขอแนะนำให้คุณลองศึกษาหุ้นอุตสาหกรรมเดียวกันที่มีลักษณะคล้ายกัน เช่น %s เพราะนี่อาจเป็น 'ทางถนัดที่แท้จริง' ของคุณ",
                        bestStock, suggestedSymbols));
                result.setRecommendedSimilarStocks(similarStocks);
            }
        }

        result.setRecommendation(rec.toString());
        result.setSuggestedTraderType(actualType);
    }

    // 4. ผิดสาย - ขาดทุน ผิดทุกอย่าง
    private void handleWrongStyleUnprofitable(UserAnalyticsResult result, String statedType, String actualType, String stockCat) {
        result.setPrimaryFeedback("สับสนทิศทางและเสียหาย (Total Misalignment)");

        String baseRec = String.format(
                "สถานการณ์น่าเป็นห่วง: คุณตั้งใจเป็น %s แต่ไปเล่นหุ้น %s และเทรดแบบ %s ผลลัพธ์คือขาดทุน",
                statedType, stockCat, actualType);

        // เรียกใช้การวินิจฉัยเชิงลึก
        String deepDiagnostic = diagnoseLossReason(result);

        // ★ แนะนำหุ้นที่ถูกสายสำหรับ statedType (ช่วยชี้ทางกลับมาถูกทาง)
        List<String> suggestedStocks = findStocksForTraderType(statedType);
        if (!suggestedStocks.isEmpty()) {
            String symbols = String.join(", ", suggestedStocks);
            deepDiagnostic += String.format(
                    "\n\n📌 ถ้าต้องการกลับมาเป็นสาย %s ลองศึกษาหุ้นเหล่านี้: %s — เหมาะกับสไตล์ที่คุณตั้งเป้าไว้",
                    statedType, symbols);
            result.setRecommendedSimilarStocks(suggestedStocks);
        }
        // ★ แนะนำให้ลองเปลี่ยนสายตามพฤติกรรมจริง
        result.setSuggestedTraderType(actualType);

        result.setRecommendation(baseRec + deepDiagnostic);
    }

    private String getTraderTypeFromCategory(String category) {
        if (category == null)
            return "Unknown";
        String cat = category.toUpperCase();
        // ปรับ Logic ให้รองรับทั้งคำไทยและอังกฤษที่ส่งมาจาก StockAnalysisService
        if (cat.contains("SPECULATIVE") || cat.contains("เก็งกำไร") || cat.contains("HIGH_VOLATILITY"))
            return "Scalper";
        if (cat.contains("TRENDING") || cat.contains("กระแส"))
            return "Day Trader";
        if (cat.contains("SWING") || cat.contains("เล่นรอบ"))
            return "Swing Trader";
        if (cat.contains("STABLE") || cat.contains("มั่นคง") || cat.contains("BLUECHIP") || cat.contains("DIVIDEND"))
            return "Position Trader";
        return "Unknown";
    }

    // วิเคราะห์พฤติกรมมเสี่ยง
    private void analyzeRiskBehaviors(UserAnalyticsResult result, List<TradeExecutionRecord> trades,
            List<OrderHistory> allOrders, String dbRiskBehavior) {

        double fomoScore = 0.0;
        double panicScore = 0.0;
        double earlySellScore = 0.0;
        double holdLoserScore = 0.0;

        // --- 0. Initialize scores based on Quiz results from Database ---
        if (dbRiskBehavior != null) {
            String behavior = dbRiskBehavior.toUpperCase();
            if (behavior.contains("FOMO"))
                fomoScore = 40.0;
            if (behavior.contains("WINNERS") || behavior.contains("EARLY"))
                earlySellScore = 40.0;
            if (behavior.contains("LOSERS") || behavior.contains("LONG"))
                holdLoserScore = 40.0;
            if (behavior.contains("PANIC"))
                panicScore = 40.0;
        }

        if (trades.isEmpty()) {
            // ถ้าไม่มีเทรดเลย ให้โชว์ค่าจาก Quiz เป็นฐานไว้ก่อน
            result.setFomoScore(fomoScore);
            result.setPanicSellScore(panicScore);
            result.setSellingWinnersTooEarlyScore(earlySellScore);
            result.setHoldingLosersTooLongScore(holdLoserScore);
            result.setFomoStatus(evaluateRiskLevel(fomoScore));
            result.setPanicSellStatus(evaluateRiskLevel(panicScore));
            result.setSellingWinnersTooEarlyStatus(evaluateRiskLevel(earlySellScore));
            result.setHoldingLosersTooLongStatus(evaluateRiskLevel(holdLoserScore));
            generateBehavioralFeedback(result);
            return;
        }

        final int RECENT_WINDOW = 50;
        // ดึง 50 ไม้ล่าสุด
        List<TradeExecutionRecord> recentTrades = trades.stream()
                .limit(RECENT_WINDOW)
                .collect(Collectors.toList());

        // 1. วิเคราะห์จาก Closed Trades (บวกเพิ่มจากค่าตั้งต้น)
        for (TradeExecutionRecord t : recentTrades) {
            double pnl = t.getRealizedProfitPercentage().doubleValue();
            long holdingHours = t.getHoldingPeriod().toHours();
            long holdingDays = t.getHoldingPeriod().toDays();

            // Selling Winners Too Early
            if (!"Scalper".equalsIgnoreCase(result.getTraderType())) {
                if (pnl > 0 && pnl < 2.0 && holdingHours < 24)
                    earlySellScore += 15.0;
                else if (pnl > 5.0 && holdingHours > 48)
                    earlySellScore -= 10.0;
            }

            // Holding Losers Too Long
            if (pnl <= -10.0 && holdingDays > 14)
                holdLoserScore += 20.0;
            else if (pnl < 0 && pnl >= -5.0 && holdingDays <= 3)
                holdLoserScore -= 10.0;
        }

        // 2. วิเคราะห์จาก Orders
        Map<String, List<OrderHistory>> ordersBySymbol = allOrders.stream()
                .sorted(Comparator.comparing(OrderHistory::getFilledAt).reversed())
                .limit(RECENT_WINDOW * 2)
                .collect(Collectors.groupingBy(OrderHistory::getSymbol));

        ZoneId marketZone = ZoneId.of("America/New_York");

        for (Map.Entry<String, List<OrderHistory>> entry : ordersBySymbol.entrySet()) {
            String symbol = entry.getKey();
            List<OrderHistory> symbolOrders = entry.getValue();

            if (symbolOrders.isEmpty())
                continue;

            Instant minTime = symbolOrders.stream().map(OrderHistory::getFilledAt).min(Instant::compareTo)
                    .orElse(Instant.now());
            Instant maxTime = symbolOrders.stream().map(OrderHistory::getFilledAt).max(Instant::compareTo)
                    .orElse(Instant.now());

            ZonedDateTime fetchStart = minTime.atZone(marketZone).minusHours(100);
            ZonedDateTime fetchEnd = maxTime.atZone(marketZone).plusHours(2);

            List<StockBar> cachedBars = new ArrayList<>();
            try {
                // ส่ง limit = 10000 เพื่อขอข้อมูลสูงสุดเท่าที่ API ให้
                cachedBars = marketDataService.getHistoricalBars(symbol, fetchStart, fetchEnd, "1Hour", 10000);
            } catch (Exception e) {
                System.err.println("Failed to fetch batch market data for " + symbol);
                continue;
            }

            for (OrderHistory order : symbolOrders) {
                try {
                    double rsi = calculateRsiFromCache(cachedBars, order.getFilledAt());
                    double priceChangePct = calculatePriceChangeFromCache(cachedBars, order.getFilledAt());

                    // Logic เดิม แต่ตรวจสอบว่า RSI ต้องไม่ใช่ 50.0 (ค่ากลาง)
                    if (rsi != 50.0) {
                        if ("buy".equalsIgnoreCase(order.getSide())) {
                            if (priceChangePct > 5.0 && rsi > 70.0)
                                fomoScore += 15.0;
                            else if (rsi < 45.0)
                                fomoScore -= 10.0;
                        } else if ("sell".equalsIgnoreCase(order.getSide())) {
                            if (priceChangePct < -5.0 && rsi < 30.0)
                                panicScore += 15.0;
                            else if (rsi > 55.0)
                                panicScore -= 10.0;
                        }
                    }
                } catch (Exception e) {
                    continue;
                }
            }
        }

        // คุมกรอบคะแนน 0-100 และบันทึกผล
        result.setFomoScore(clamp(fomoScore));
        result.setPanicSellScore(clamp(panicScore));
        result.setSellingWinnersTooEarlyScore(clamp(earlySellScore));
        result.setHoldingLosersTooLongScore(clamp(holdLoserScore));

        // ตั้งค่า Status
        result.setFomoStatus(evaluateRiskLevel(result.getFomoScore()));
        result.setPanicSellStatus(evaluateRiskLevel(result.getPanicSellScore()));
        result.setSellingWinnersTooEarlyStatus(evaluateRiskLevel(result.getSellingWinnersTooEarlyScore()));
        result.setHoldingLosersTooLongStatus(evaluateRiskLevel(result.getHoldingLosersTooLongScore()));

        generateBehavioralFeedback(result);
    }

    // ช่วยควบคุมให้ค่าคะแนน (Score) อยู่ในช่วงที่กำหนดเสมอ เช่น 0 ถึง 100
    private double clamp(double value) {
        return Math.max(0, Math.min(100, value));
    }

    private String evaluateRiskLevel(double score) {
        if (score >= 80.0)
            return "พฤติกรรมเสี่ยง";
        if (score >= 60.0)
            return "มีแนวโน้ม";
        return "ปกติ";
    }

    private void generateBehavioralFeedback(UserAnalyticsResult result) {
        List<String> feedbacks = new ArrayList<>();
        if ("พฤติกรรมเสี่ยง".equals(result.getFomoStatus())) {
            feedbacks.add("คุณมีภาวะ FOMO สูง มักเข้าซื้อตอนที่ราคาพุ่งไปแล้ว เสี่ยงต่อการติดดอย");
        }
        if ("พฤติกรรมเสี่ยง".equals(result.getPanicSellStatus())) {
            feedbacks.add("คุณมีภาวะ Panic Sell มักเทขายหุ้นในจังหวะที่ตลาดตกใจสุดขีด ซึ่งมักจะเป็นจุดต่ำสุดของรอบ");
        }
        if ("พฤติกรรมเสี่ยง".equals(result.getSellingWinnersTooEarlyStatus())) {
            feedbacks.add(
                    "คุณขายหมูบ่อยเกินไป (Selling Winners Too Early) รีบขายทั้งที่เทรนด์ยังไปต่อได้ ทำให้ Risk/Reward ไม่คุ้มค่า");
        }
        if ("พฤติกรรมเสี่ยง".equals(result.getHoldingLosersTooLongStatus())) {
            feedbacks.add("คุณทนถือหุ้นขาดทุนนานเกินไป (Holding Losers Too Long) ควรตั้งจุด Stop Loss อย่างเคร่งครัด");
        }

        if (!feedbacks.isEmpty()) {
            result.setBehavioralFeedback(String.join(" | ", feedbacks));
        } else {
            result.setBehavioralFeedback("การควบคุมอารมณ์ในการเทรดอยู่ในเกณฑ์ดี ไม่มีพฤติกรรมเสี่ยงที่ชัดเจน");
        }
    }

    private double getMarketRsiAtTime(String symbol, java.time.Instant time) {
        try {
            // RSI 14 ใช้ข้อมูลย้อนหลัง 14 แท่ง แต่เราดึงเผื่อ 30 แท่ง (Timeframe 1Hour)
            // เพื่อให้ครอบคลุมช่วงเวลาเทรด
            ZonedDateTime tradeTime = time.atZone(ZoneId.of("America/New_York"));
            ZonedDateTime startTime = tradeTime.minusHours(40); // ดึงเผื่อ

            List<StockBar> bars = marketDataService.getHistoricalBars(symbol, startTime, tradeTime, "1Hour", 10000);

            if (bars.size() < 15)
                return 50.0; // ข้อมูลไม่พอคำนวณ RSI

            // คำนวณ RSI (Standard 14 Periods)
            return calculateRSI(bars, 14);

        } catch (Exception e) {
            System.err.println("Error calculating RSI: " + e.getMessage());
            return 50.0; // ค่ากลางๆ
        }
    }

    private double getPriceChangeBeforeTrade(String symbol, java.time.Instant time) {
        try {
            // เทียบราคา ณ เวลาเทรด กับ 24 ชั่วโมงก่อนหน้า
            ZonedDateTime tradeTime = time.atZone(ZoneId.of("America/New_York"));
            ZonedDateTime startTime = tradeTime.minusHours(25);

            List<StockBar> bars = marketDataService.getHistoricalBars(symbol, startTime, tradeTime, "1Hour", 10000);

            if (bars.isEmpty())
                return 0.0;

            double currentPrice = bars.get(bars.size() - 1).getC(); // ราคาปิดแท่งล่าสุด (ตอนเทรด)
            double prevPrice = bars.get(0).getC(); // ราคาปิดเมื่อ 24 ชม. ที่แล้ว (ประมาณแท่งแรกๆ)

            // หาแท่งที่เวลาใกล้เคียง 24 ชม. ที่แล้วที่สุด
            for (StockBar bar : bars) {
                long hoursDiff = java.time.Duration.between(bar.getT(), tradeTime).toHours();
                if (hoursDiff >= 24) {
                    prevPrice = bar.getC();
                } else {
                    break; // หยุดเมื่อเจอแท่งที่ใหม่กว่า 24 ชม.
                }
            }

            if (prevPrice == 0)
                return 0.0;

            // สูตร: ((ราคาปัจจุบัน - ราคาเก่า) / ราคาเก่า) * 100
            return ((currentPrice - prevPrice) / prevPrice) * 100.0;

        } catch (Exception e) {
            System.err.println("Error calculating Price Change: " + e.getMessage());
            return 0.0;
        }
    }

    // สูตรคำนวณ RSI มาตรฐาน
    private double calculateRSI(List<StockBar> bars, int period) {
        if (bars.size() <= period)
            return 50.0;

        double avgGain = 0.0;
        double avgLoss = 0.0;

        // คำนวณ RSI รอบแรก
        for (int i = 1; i <= period; i++) {
            double change = bars.get(i).getC() - bars.get(i - 1).getC();
            if (change > 0)
                avgGain += change;
            else
                avgLoss += Math.abs(change);
        }

        avgGain /= period;
        avgLoss /= period;

        // คำนวณ RSI แบบ Smoothing (Wilder's Smoothing) สำหรับแท่งที่เหลือ
        for (int i = period + 1; i < bars.size(); i++) {
            double change = bars.get(i).getC() - bars.get(i - 1).getC();
            double gain = (change > 0) ? change : 0.0;
            double loss = (change < 0) ? Math.abs(change) : 0.0;

            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        }

        if (avgLoss == 0)
            return 100.0; // กำไรล้วน
        double rs = avgGain / avgLoss;
        return 100.0 - (100.0 / (1.0 + rs));
    }

    public void updateTraderType(Long userId, String newType) {
        // 1. ค้นหา User
        UserAccount user = accountRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. ตรวจสอบว่า Type ที่ส่งมาถูกต้องไหม (กันมั่ว)
        if (newType == null || newType.trim().isEmpty()) {
            throw new IllegalArgumentException("Invalid Trader Type");
        }

        // 3. อัปเดตและบันทึก
        user.setTraderType(newType);
        accountRepository.save(user);
    }

    // ฟังก์ชันนี้คือหัวใจสำคัญ: หา Category ให้ได้ ไม่ว่าจะมาจาก DB หรือคำนวณสด
    private String fetchStockCategorySafely(String symbol) {
        // 1. ลองหาใน Database ก่อน (เร็วสุด)
        return stockAssetRepository.findById(symbol)
                .map(StockAsset::getCategory)
                .orElseGet(() -> {
                    // 2. ถ้าไม่เจอใน DB -> เรียก StockAnalysisService ให้คำนวณสด (On-the-fly)
                    // (ฟังก์ชันนี้จะยิง Finnhub -> คำนวณ Beta/MarketCap -> ตีตรา Category)
                    try {
                        var stockInfo = stockAnalysisService.getStockInfo(symbol);
                        if (stockInfo != null) {
                            return stockInfo.getCategory(); // ส่งคืนค่าที่คำนวณได้ เช่น "SPECULATIVE"
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to analyze stock category for: " + symbol);
                    }
                    return "UNKNOWN"; // ถ้าสุดวิสัยจริงๆ ค่อยยอมแพ้
                });
    }

    private void calculateHighlights(UserAnalyticsResult result, List<TradeExecutionRecord> trades) {
        if (trades.isEmpty())
            return;

        // 1. หา "หุ้นลูกรัก" (เทรดบ่อยสุด)
        Map<String, Long> tradeCounts = trades.stream()
                .collect(Collectors.groupingBy(TradeExecutionRecord::getSymbol, Collectors.counting()));

        tradeCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .ifPresent(e -> {
                    result.setMostTradedStock(e.getKey());
                    result.setMostTradedStockCount(e.getValue());
                });

        // 2. หา "หุ้นทำเงิน" และ "หุ้นตัวร้าย" (คิดจาก PnL รวมของหุ้นตัวนั้นๆ)
        Map<String, Double> pnlBySymbol = trades.stream()
                .collect(Collectors.groupingBy(
                        TradeExecutionRecord::getSymbol,
                        Collectors.summingDouble(t -> t.getRealizedProfitPercentage().doubleValue())));

        // หุ้นทำเงิน (Max PnL)
        pnlBySymbol.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .ifPresent(e -> {
                    if (e.getValue() > 0) { // ต้องกำไรจริงๆ ถึงจะโชว์
                        result.setBestPerformingStock(e.getKey());
                        result.setBestPerformingStockPnL(e.getValue());
                    } else {
                        result.setBestPerformingStock("-"); // ไม่มีตัวไหนกำไรเลย
                    }
                });

        // หุ้นตัวร้าย (Min PnL)
        pnlBySymbol.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .ifPresent(e -> {
                    if (e.getValue() < 0) { // ต้องขาดทุนจริงๆ ถึงจะโชว์
                        result.setWorstPerformingStock(e.getKey());
                        result.setWorstPerformingStockPnL(e.getValue());
                    } else {
                        result.setWorstPerformingStock("-"); // ไม่มีตัวไหนขาดทุนเลย
                    }
                });

        // 3. หา "หุ้นถือลืม" (ถือนานสุดใน 1 ไม้)
        trades.stream()
                .max(Comparator.comparing(TradeExecutionRecord::getHoldingPeriod))
                .ifPresent(t -> {
                    result.setLongestHeldStock(t.getSymbol());

                    long days = t.getHoldingPeriod().toDays();
                    long hours = t.getHoldingPeriod().toHours() % 24;
                    long minutes = t.getHoldingPeriod().toMinutes() % 60;

                    String durationText;
                    if (days > 0)
                        durationText = String.format("%d วัน %d ชม.", days, hours);
                    else if (hours > 0)
                        durationText = String.format("%d ชม. %d นาที", hours, minutes);
                    else
                        durationText = String.format("%d นาที", minutes);

                    result.setLongestHeldDuration(durationText);
                });
    }

    private TradeExecutionRecord createTradeRecord(OrderHistory openOrder, OrderHistory closeOrder, BigDecimal qty,
            String category) {
        TradeExecutionRecord record = new TradeExecutionRecord();
        record.setSymbol(openOrder.getSymbol());
        record.setCategory(category);

        // จัดการเรื่องเวลา (Timezone: America/New_York)
        ZoneId marketZone = ZoneId.of("America/New_York");

        LocalDateTime entryDateTime = LocalDateTime.ofInstant(openOrder.getFilledAt(), marketZone);
        LocalDateTime exitDateTime = LocalDateTime.ofInstant(closeOrder.getFilledAt(), marketZone);

        record.setEntryTime(entryDateTime);
        record.setExitTime(exitDateTime); // เพิ่มการบันทึกเวลาออก
        record.setHoldingPeriod(Duration.between(openOrder.getFilledAt(), closeOrder.getFilledAt()));

        // Check Overnight (เช็คจากวันที่ของ Market Time)
        record.setOvernight(!entryDateTime.toLocalDate().isEqual(exitDateTime.toLocalDate()));

        BigDecimal openPrice = openOrder.getFilledAvgPrice();
        BigDecimal closePrice = closeOrder.getFilledAvgPrice();
        BigDecimal pnlAmount;

        // คำนวณกำไรแยกกรณี Long vs Short (Logic ถูกต้องแล้วครับ)
        if ("buy".equalsIgnoreCase(openOrder.getSide())) {
            // Case Long (ซื้อถูก -> ขายแพง): (Close - Open) * Qty
            pnlAmount = closePrice.subtract(openPrice).multiply(qty);
        } else {
            // Case Short (ขายแพง -> ซื้อถูก): (Open - Close) * Qty
            pnlAmount = openPrice.subtract(closePrice).multiply(qty);
        }

        record.setRealizedProfitAmount(pnlAmount);
        record.setPositionSize(openPrice.multiply(qty));

        // คำนวณ % Profit
        if (openPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal diff;
            if ("buy".equalsIgnoreCase(openOrder.getSide())) {
                diff = closePrice.subtract(openPrice);
            } else {
                diff = openPrice.subtract(closePrice);
            }

            // สูตร: (Diff / Open) * 100
            BigDecimal pnlPct = diff.divide(openPrice, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            record.setRealizedProfitPercentage(pnlPct);
        } else {
            record.setRealizedProfitPercentage(BigDecimal.ZERO);
        }

        return record;
    }

    private void calculateAdvancedMetrics(UserAnalyticsResult result, List<TradeExecutionRecord> trades) {
        if (trades.isEmpty())
            return;

        // 1. Profit Factor (Gross Profit / Gross Loss)
        BigDecimal grossProfit = BigDecimal.ZERO;
        BigDecimal grossLoss = BigDecimal.ZERO;

        int currentWinStreak = 0;
        int maxWinStreak = 0;
        int currentLossStreak = 0;
        int maxLossStreak = 0;

        for (TradeExecutionRecord t : trades) {
            BigDecimal pnl = t.getRealizedProfitAmount();

            // Profit Factor Logic
            if (pnl.compareTo(BigDecimal.ZERO) > 0) {
                grossProfit = grossProfit.add(pnl);

                // Streak Logic
                currentWinStreak++;
                currentLossStreak = 0;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            } else if (pnl.compareTo(BigDecimal.ZERO) < 0) {
                grossLoss = grossLoss.add(pnl.abs());

                // Streak Logic
                currentLossStreak++;
                currentWinStreak = 0;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
            }
        }

        // Set Profit Factor
        if (grossLoss.compareTo(BigDecimal.ZERO) == 0) {
            result.setProfitFactor(grossProfit.doubleValue() > 0 ? 999.0 : 0.0); // 999 แทน Infinity
            result.setProfitFactorFeedback("ไร้พ่าย! (No Loss)");
        } else {
            double pf = grossProfit.divide(grossLoss, 2, RoundingMode.HALF_UP).doubleValue();
            result.setProfitFactor(pf);
            if (pf >= 2.0)
                result.setProfitFactorFeedback("ยอดเยี่ยม (Excellent System)");
            else if (pf >= 1.5)
                result.setProfitFactorFeedback("ดี (Good System)");
            else if (pf >= 1.0)
                result.setProfitFactorFeedback("พอใช้ (Breakeven/Marginal)");
            else
                result.setProfitFactorFeedback("ขาดทุน (Losing System)");
        }

        // Set Streaks
        result.setMaxConsecutiveWins(maxWinStreak);
        result.setMaxConsecutiveLosses(maxLossStreak);
        if (maxLossStreak >= 3) {
            result.setStreakFeedback("ระวัง! คุณเริ่มแพ้ติดกันบ่อย พักปรับอารมณ์บ้าง (Cool-down needed)");
        } else {
            result.setStreakFeedback("การควบคุมอารมณ์ยังดีอยู่");
        }

        // 2. Diversification & Sizing Logic
        // เช็คว่าลงเงินกับตัวไหนเยอะผิดปกติไหม
        Map<String, BigDecimal> exposureBySymbol = new HashMap<>();
        BigDecimal totalExposure = BigDecimal.ZERO;

        for (TradeExecutionRecord t : trades) {
            BigDecimal size = t.getPositionSize();
            exposureBySymbol.merge(t.getSymbol(), size, BigDecimal::add);
            totalExposure = totalExposure.add(size);
        }

        if (totalExposure.compareTo(BigDecimal.ZERO) > 0) {
            String mostExposedSymbol = "";
            double maxPct = 0.0;

            for (Map.Entry<String, BigDecimal> entry : exposureBySymbol.entrySet()) {
                double pct = entry.getValue().divide(totalExposure, 4, RoundingMode.HALF_UP).doubleValue() * 100;
                if (pct > maxPct) {
                    maxPct = pct;
                    mostExposedSymbol = entry.getKey();
                }
            }

            if (maxPct > 50.0) {
                result.setDiversificationFeedback(String.format("กระจุกตัวสูง! คุณทุ่มเงินกับ %s ไปถึง %.1f%% ของพอร์ต",
                        mostExposedSymbol, maxPct));
            } else {
                result.setDiversificationFeedback("กระจายความเสี่ยงได้ดี (Well Diversified)");
            }
        }

        // 3. Position Sizing Analysis (วิเคราะห์ขนาดไม้: เทียบเงินที่ลงในไม้ชนะ vs ไม้แพ้)
        BigDecimal totalWinSize = BigDecimal.ZERO;
        BigDecimal totalLossSize = BigDecimal.ZERO;
        int winSizeCount = 0;
        int lossSizeCount = 0;
        BigDecimal maxPositionSize = BigDecimal.ZERO;
        BigDecimal minPositionSize = null;

        for (TradeExecutionRecord t : trades) {
            BigDecimal size = t.getPositionSize();
            if (size == null || size.compareTo(BigDecimal.ZERO) <= 0) continue;

            if (maxPositionSize.compareTo(size) < 0) maxPositionSize = size;
            if (minPositionSize == null || minPositionSize.compareTo(size) > 0) minPositionSize = size;

            if (t.getRealizedProfitAmount().compareTo(BigDecimal.ZERO) > 0) {
                totalWinSize = totalWinSize.add(size);
                winSizeCount++;
            } else if (t.getRealizedProfitAmount().compareTo(BigDecimal.ZERO) < 0) {
                totalLossSize = totalLossSize.add(size);
                lossSizeCount++;
            }
        }

        if (winSizeCount > 0 && lossSizeCount > 0) {
            BigDecimal avgWinSize = totalWinSize.divide(BigDecimal.valueOf(winSizeCount), 2, RoundingMode.HALF_UP);
            BigDecimal avgLossSize = totalLossSize.divide(BigDecimal.valueOf(lossSizeCount), 2, RoundingMode.HALF_UP);

            if (avgWinSize.compareTo(BigDecimal.ZERO) > 0) {
                double sizeRatio = avgLossSize.doubleValue() / avgWinSize.doubleValue();

                if (sizeRatio > 1.5) {
                    result.setSizingFeedback(String.format(
                            "อันตราย! คุณมักลงเงินหนักในไม้ที่ขาดทุน (%.1fx ของไม้ชนะ) ควรลงเงินเท่ากันทุกไม้ หรือลงน้อยลงเมื่อไม่มั่นใจ (Over-betting on Losers)",
                            sizeRatio));
                } else if (sizeRatio < 0.7) {
                    result.setSizingFeedback(
                            "ดี! คุณลงเงินน้อยในไม้ที่ขาดทุน แสดงว่ามีวินัยในการบริหารขนาดไม้ (Smart Sizing)");
                } else {
                    result.setSizingFeedback(
                            "ขนาดไม้สม่ำเสมอ (Consistent Sizing) ถือว่าควบคุมได้ดี ไม่มีพฤติกรรม Over-bet");
                }
            }
        } else if (minPositionSize != null && maxPositionSize.compareTo(BigDecimal.ZERO) > 0
                && minPositionSize.compareTo(BigDecimal.ZERO) > 0) {
            double variance = maxPositionSize.divide(minPositionSize, 2, RoundingMode.HALF_UP).doubleValue();
            if (variance > 5.0) {
                result.setSizingFeedback(String.format(
                        "ขนาดไม้ผันผวนมาก (ใหญ่สุด/เล็กสุด = %.1fx) ควรกำหนดขนาดไม้ให้สม่ำเสมอเพื่อลดความเสี่ยง",
                        variance));
            } else {
                result.setSizingFeedback("ขนาดไม้อยู่ในเกณฑ์ปกติ ยังไม่มีข้อมูลเพียงพอวิเคราะห์เชิงลึก");
            }
        }
    }

    private double calculateRsiFromCache(List<StockBar> bars, Instant tradeTimeInstant) {
        if (bars == null || bars.isEmpty())
            return 50.0;

        ZonedDateTime tradeTime = tradeTimeInstant.atZone(ZoneId.of("America/New_York"));

        // กรองเอาเฉพาะ Bar ที่เกิดก่อนหรือเท่ากับเวลาเทรด
        List<StockBar> relevantBars = bars.stream()
                .filter(b -> !b.getT().isAfter(tradeTime.toOffsetDateTime())) // เอา bar ที่ time <= tradeTime
                .sorted(Comparator.comparing(StockBar::getT)) // เรียงเก่า -> ใหม่
                .collect(Collectors.toList());

        if (relevantBars.size() < 15)
            return 50.0;

        // ตัดเอาแค่ส่วนท้ายๆ มาคำนวณ RSI (ใช้ฟังก์ชันเดิมได้เลย)
        return calculateRSI(relevantBars, 14);
    }

    private double calculatePriceChangeFromCache(List<StockBar> bars, Instant tradeTimeInstant) {
        if (bars == null || bars.isEmpty())
            return 0.0;

        ZonedDateTime tradeTime = tradeTimeInstant.atZone(ZoneId.of("America/New_York"));

        // หา Bar ล่าสุด ณ เวลาเทรด (Current Price)
        StockBar currentBar = null;
        for (int i = bars.size() - 1; i >= 0; i--) {
            if (!bars.get(i).getT().isAfter(tradeTime.toOffsetDateTime())) {
                currentBar = bars.get(i);
                break;
            }
        }
        if (currentBar == null)
            return 0.0;

        // หา Bar เมื่อ 24 ชม. ที่แล้ว (Previous Price)
        StockBar prevBar = bars.get(0);
        for (StockBar bar : bars) {
            long hoursDiff = Duration.between(bar.getT(), tradeTime).toHours();
            if (hoursDiff <= 24) {
                prevBar = bar; // เจอแท่งแรกที่อยู่ใน range 24 ชม.
                break;
            }
        }

        double currentPrice = currentBar.getC();
        double prevPrice = prevBar.getC();

        if (prevPrice == 0)
            return 0.0;
        return ((currentPrice - prevPrice) / prevPrice) * 100.0;
    }

    private List<String> findSimilarStocks(String symbol, String category){
        if (symbol == null || symbol.equals("-")) return new ArrayList<>();

        return stockAssetRepository.findById(symbol).map(asset -> {
            String industry = asset.getIndustry();
            String cat = (category != null) ? category : asset.getCategory();

            // ลอง 1: หาตาม Category + Industry (เจาะจงที่สุด)
            if (industry != null && !industry.isEmpty() && cat != null) {
                List<String> results = stockAssetRepository
                        .findTop3ByCategoryAndIndustryAndSymbolNot(cat, industry, symbol)
                        .stream().map(StockAsset::getSymbol).collect(Collectors.toList());
                if (!results.isEmpty()) return results;
            }

            // ลอง 2 (Fallback): หาตาม Category อย่างเดียว (กว้างขึ้น)
            if (cat != null) {
                return stockAssetRepository.findTop5ByCategoryAndIsTradableTrue(cat)
                        .stream()
                        .map(StockAsset::getSymbol)
                        .filter(s -> !s.equals(symbol))
                        .limit(3)
                        .collect(Collectors.toList());
            }

            return new ArrayList<String>();
        }).orElse(new ArrayList<>());
    }

    // ★ หาหุ้นแนะนำตามประเภทนักเทรด (ใช้เมื่อไม่มี bestPerformingStock)
    private List<String> findStocksForTraderType(String traderType) {
        String dbCategory = switch (traderType != null ? traderType : "Unknown") {
            case "Scalper" -> "SPECULATIVE";
            case "Day Trader" -> "TRENDING";
            case "Swing Trader" -> "SWING";
            case "Position Trader" -> "STABLE";
            default -> null;
        };
        if (dbCategory == null) return new ArrayList<>();

        try {
            return stockAssetRepository.findTop5ByCategoryAndIsTradableTrue(dbCategory)
                    .stream()
                    .map(StockAsset::getSymbol)
                    .limit(5)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Failed to find stocks for trader type: " + traderType);
            return new ArrayList<>();
        }
    }

    // เพิ่มฟังก์ชันสำหรับคำนวณจำนวนไม้ขั้นต่ำแบบ Dynamic ตามประเภทนักเทรด
    private int getRequiredTradeCount(String traderType) {
        if (traderType == null) return 20; // ค่ามาตรฐาน
        return switch (traderType) {
            case "Scalper" -> 50;         // เทรดบ่อยมาก ต้องใช้จำนวนไม้สูงเพื่อตัด Noise
            case "Day Trader" -> 30;      // จบในวัน ใช้จำนวนระดับปานกลาง
            case "Swing Trader" -> 20;    // ถือข้ามวัน/ข้ามสัปดาห์
            case "Position Trader" -> 10; // ถือยาวมาก รอบคัดกรองสูง 10 ไม้ก็เพียงพอ
            default -> 20;
        };
    }

    // ฟังก์ชัน: เจาะลึกสาเหตุการขาดทุนด้วย Win Rate, Risk/Reward, Money Management และ Risk Behaviors (Dynamic Threshold)
    private String diagnoseLossReason(UserAnalyticsResult result) {
        StringBuilder diag = new StringBuilder("\n\nวิเคราะห์สาเหตุการขาดทุนเชิงลึก (Trading Diagnostics):\n");

        int totalTrades = result.getTotalClosedTrades();
        String traderType = result.getTraderType() != null ? result.getTraderType() : "Unknown";

        // ดึงค่าจำนวนไม้ขั้นต่ำแบบ Dynamic
        int requiredTrades = getRequiredTradeCount(traderType);

        // PHASE 1: Data Gathering Phase (ช่วงเก็บข้อมูล ยังไม่ถึงเกณฑ์)
        if (totalTrades < requiredTrades) {
            diag.append(String.format("ข้อมูลยังไม่เพียงพอ: สำหรับนักเทรดสาย %s เพิ่งเทรดจบไปเพียง %d ไม้ (ระบบต้องการอย่างน้อย %d ไม้เพื่อกรอง 'โชค' ออกจาก 'ฝีมือ')\n", traderType, totalTrades, requiredTrades));
            diag.append("   - คำแนะนำช่วงเริ่มต้น: ในช่วงนี้อย่าเพิ่งกังวลกับ Win Rate หรือ Profit Factor ให้โฟกัสไปที่ 'การทำตามระบบ' และ 'การรักษาเงินทุน' เป็นหลัก\n");
            // แม้ข้อมูลน้อย แต่ถ้าทำผิดพลาดเรื่อง Money Management ร้ายแรง ต้องเตือนทันที
            boolean hasCriticalError = false;
            if (result.getDiversificationFeedback() != null && result.getDiversificationFeedback().contains("กระจุกตัวสูง")) {
                diag.append("\nคำเตือนเร่งด่วน (Critical Warning):\n");
                diag.append("- ตรวจพบการลงเงินกระจุกตัว (Over-betting): คุณกำลังทุ่มเงินกับหุ้นบางตัวมากเกินไป ไม่ว่าระบบเทรดจะดีแค่ไหน การไม่กระจายความเสี่ยงจะทำให้พอร์ตพังในไม้เดียว\n");
                hasCriticalError = true;
            }
            if (result.getWorstPerformingStockPnL() <= -20.0) {
                if (!hasCriticalError) diag.append("\nคำเตือนเร่งด่วน (Critical Warning):\n");
                diag.append(String.format("- ตรวจพบการปล่อยขาดทุนหนัก: หุ้น %s ติดลบถึง %.2f%% คุณต้องหัดใช้ Stop Loss ทันที อย่าปล่อยให้ขาดทุนบานปลาย\n", result.getWorstPerformingStock(), result.getWorstPerformingStockPnL()));
            }

            return diag.toString();
        }

        // PHASE 2: Deep Analytics Phase (เทรดผ่านเกณฑ์ขั้นต่ำแล้ว)
        // 1. ตรวจสอบสมการความสำเร็จ (Win Rate vs Risk/Reward)
        if (result.getWinRate() >= 50.0 && result.getRiskRewardRatio() < 1.0) {
            diag.append("- ความแม่นยำ (Win Rate) ดี แต่ Risk/Reward ต่ำ: คุณมีจุดเข้าที่ดี แต่มักจะ 'ตัดกำไรไว แต่ทนถือขาดทุน' (ได้น้อย เสียมาก)\n");
        } else if (result.getWinRate() < 50.0 && result.getRiskRewardRatio() >= 1.5) {
            diag.append("- จุดคุ้มทุน (R:R) ดี แต่ความแม่นยำต่ำ: ปัญหาอยู่ที่ 'จุดเข้าซื้อ' (Entry Point) ควรใช้ Technical Analysis คัดกรองสัญญาณให้แม่นยำขึ้น\n");
        } else if (result.getWinRate() < 50.0 && result.getRiskRewardRatio() < 1.0) {
            diag.append("- ระบบเทรดพังทั้งความแม่นยำและจุดคุ้มทุน: แนะนำให้หยุดเทรดเงินจริง และกลับไป Backtest กลยุทธ์ใหม่ทั้งหมด\n");
        }

        // 2. ตรวจสอบประสิทธิภาพรวม (Profit Factor)
        if (result.getProfitFactor() < 1.0 && result.getProfitFactor() > 0.0) {
            diag.append(String.format("- Profit Factor ต่ำ (%.2f): ระบบเทรดโดยรวมยังเป็นลบ (Gross Loss สูงกว่า Gross Profit) บ่งบอกว่ากลยุทธ์ปัจจุบันยังไม่สามารถทำกำไรในระยะยาวได้\n", result.getProfitFactor()));
        }

        // 3. ตรวจสอบภาวะอารมณ์ (Losing Streak / Tilt)
        if (result.getMaxConsecutiveLosses() >= 4) {
            diag.append(String.format("-  อาการหัวร้อน (Revenge Trading): คุณมีการเทรดเสียติดต่อกันถึง %d ไม้ บ่งบอกถึงการฝืนเทรดเพื่อเอาคืน ควรมีกฎ Daily Loss Limit (แพ้ครบจำนวนต้องหยุดเทรดทันที)\n", result.getMaxConsecutiveLosses()));
        }

        // 4. ตรวจสอบการบริหารหน้าตัก (Position Sizing)
        if (result.getDiversificationFeedback() != null && result.getDiversificationFeedback().contains("กระจุกตัวสูง")) {
            diag.append("-  การจัดการเงินทุน (Position Sizing) ผิดพลาด: คุณลงเงินกระจุกตัวในหุ้นบางตัวมากเกินไป (Over-betting) เมื่อผิดทางจึงส่งผลให้พอร์ตเสียหายหนัก\n");
        }
        // 5. วิเคราะห์หา "ตัวสูบเงิน" (Worst Performing Stock)
        if (result.getWorstPerformingStock() != null && !result.getWorstPerformingStock().equals("-")) {
            diag.append(String.format("- หุ้นตัวร้าย (Capital Drainer): หุ้นที่ดึงเงินจากพอร์ตคุณมากที่สุดคือ %s (ขาดทุนรวม %.2f%%) ระวังการฝืนเล่นหุ้นตัวนี้ด้วยความหวัง (Hope) หรือความดื้อรั้น\n",
                    result.getWorstPerformingStock(), result.getWorstPerformingStockPnL()));
        }
        // 6. เอาพฤติกรรมเสี่ยง (Risk Behaviors) เข้ามาผสม
        boolean hasBehavioralIssue = false;
        if ("พฤติกรรมเสี่ยง".equals(result.getFomoStatus())) {
            diag.append("-  อาการ FOMO: คุณมักไล่ซื้อหุ้นตอนที่ราคาวิ่งไปไกลแล้ว (Buy High) ทำให้ดอยง่าย\n");
            hasBehavioralIssue = true;
        }
        if ("พฤติกรรมเสี่ยง".equals(result.getHoldingLosersTooLongStatus())) {
            diag.append("-  ขาดวินัย Stop Loss: คุณทนถือหุ้นขาดทุน (Holding Losers) หวังให้มันกลับมา ซึ่งกัดกินพอร์ตอย่างรุนแรง\n");
            hasBehavioralIssue = true;
        }
        if ("พฤติกรรมเสี่ยง".equals(result.getSellingWinnersTooEarlyStatus())) {
            diag.append("-  ขายหมูบ่อย (Selling Winners Too Early): รีบขายทำกำไรเกินไป ทำให้เวลาได้กำไรไม่พอชดเชยกับเวลาที่เสียไป\n");
            hasBehavioralIssue = true;
        }

        if (hasBehavioralIssue || result.getMaxConsecutiveLosses() >= 4) {
            diag.append("\nคำแนะนำจากมืออาชีพ: ปัญหาหลักของคุณตอนนี้ไม่ใช่ 'ความรู้ทางเทคนิค' แต่เป็น 'วินัยและอารมณ์' จงจำกัดความเสี่ยงต่อไม้ (Risk per trade) ไม่เกิน 1-2% ของพอร์ต และตั้ง Stop Loss เสมอ");
        }
        return diag.toString();
    }
}
