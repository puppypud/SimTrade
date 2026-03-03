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
                                AccountRepository accountRepository, MarketDataService marketDataService, StockAnalysisService stockAnalysisService) {
        this.orderRepository = orderRepository;
        this.stockAssetRepository = stockAssetRepository;
        this.accountRepository = accountRepository;
        this.marketDataService = marketDataService;
        this.stockAnalysisService = stockAnalysisService;
    }

    private static class RemainingOrder {
        OrderHistory order;
        BigDecimal remainingQty;

        public RemainingOrder(OrderHistory order) {
            this.order = order;
            this.remainingQty = order.getFilledQty();
        }
    }
    public UserAnalyticsResult analyzeUserBehavior(Long userId) {
        // 1. ดึงข้อมูล User Account เพื่อเอา Trader Type เดิม (Stated Type)
        UserAccount user = accountRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String statedType = user.getTraderType();

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
            return emptyResult;
        }

        List<TradeExecutionRecord> closedTrades = matchTradesFIFO(orders);

        // 3. คำนวณพฤติกรรมจริง (Actual Behavior) จากระยะเวลาถือครอง
        String actualBehaviorType = classifyTraderType(closedTrades);

        // 4. ส่งค่าทั้ง 3 อย่างไปวิเคราะห์ (Stated vs Actual vs Stock Category)
        UserAnalyticsResult result = performDeepAnalytics(statedType, actualBehaviorType, closedTrades);

        // 5. วิเคราะห์พฤติกรรมเสี่ยง
        analyzeRiskBehaviors(result, closedTrades, orders);

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
            LinkedList<RemainingOrder> longQueue = new LinkedList<>();  // เก็บไม้ Buy ที่รอขาย
            LinkedList<RemainingOrder> shortQueue = new LinkedList<>(); // เก็บไม้ Sell (Short) ที่รอซื้อคืน
            String stockCategory = fetchStockCategorySafely(symbol);

            for (OrderHistory currentOrder : entry.getValue()) {
                BigDecimal qtyToMatch = currentOrder.getFilledQty();

                if ("buy".equalsIgnoreCase(currentOrder.getSide())) {
                    // --- กรณีเจอไม้ BUY ---
                    // 1. เช็คก่อนว่ามีไม้ Short ค้างอยู่ให้ปิดไหม? (Cover Short)
                    while (qtyToMatch.compareTo(BigDecimal.ZERO) > 0 && !shortQueue.isEmpty()) {
                        RemainingOrder openShort = shortQueue.peek();
                        BigDecimal matchedQty = qtyToMatch.min(openShort.remainingQty);

                        // บันทึก Trade: Sell (Open) -> Buy (Close)
                        closedTrades.add(createTradeRecord(openShort.order, currentOrder, matchedQty, stockCategory));

                        qtyToMatch = qtyToMatch.subtract(matchedQty);
                        openShort.remainingQty = openShort.remainingQty.subtract(matchedQty);

                        if (openShort.remainingQty.compareTo(BigDecimal.ZERO) == 0) {
                            shortQueue.poll();
                        }
                    }
                    // 2. ถ้าเหลือ (หรือไม่มี Short) ให้เก็บเข้า Long Queue
                    if (qtyToMatch.compareTo(BigDecimal.ZERO) > 0) {
                        currentOrder.setFilledQty(qtyToMatch); // Update ยอดที่เหลือจริง
                        longQueue.add(new RemainingOrder(currentOrder));
                    }

                } else if ("sell".equalsIgnoreCase(currentOrder.getSide())) {
                    // --- กรณีเจอไม้ SELL ---
                    // 1. เช็คก่อนว่ามีของในมือให้ขายไหม? (Close Long)
                    while (qtyToMatch.compareTo(BigDecimal.ZERO) > 0 && !longQueue.isEmpty()) {
                        RemainingOrder openLong = longQueue.peek();
                        BigDecimal matchedQty = qtyToMatch.min(openLong.remainingQty);

                        // บันทึก Trade: Buy (Open) -> Sell (Close)
                        closedTrades.add(createTradeRecord(openLong.order, currentOrder, matchedQty, stockCategory));

                        qtyToMatch = qtyToMatch.subtract(matchedQty);
                        openLong.remainingQty = openLong.remainingQty.subtract(matchedQty);

                        if (openLong.remainingQty.compareTo(BigDecimal.ZERO) == 0) {
                            longQueue.poll();
                        }
                    }
                    // 2. ถ้าเหลือ (ขายเกินจำนวนที่มี) ให้ถือเป็น Short Sell
                    if (qtyToMatch.compareTo(BigDecimal.ZERO) > 0) {
                        currentOrder.setFilledQty(qtyToMatch); // Update ยอดที่เหลือจริง
                        shortQueue.add(new RemainingOrder(currentOrder));
                    }
                }
            }
        }
        return closedTrades;
    }

    // ==========================================
    // ส่วนที่ 2: วิเคราะห์แยกประภทนักเทรด
    // ==========================================
    private String classifyTraderType(List<TradeExecutionRecord> trades) {
        if (trades.isEmpty())
            return "Unknown";

        long totalSeconds = 0;
        int overnightCount = 0;

        for (TradeExecutionRecord t : trades) {
            totalSeconds += t.getHoldingPeriod().getSeconds();
            if (t.isOvernight())
                overnightCount++;
        }

        double avgHoldingSeconds = (double) totalSeconds / trades.size();
        double overnightRatio = (double) overnightCount / trades.size();

        // เกณฑ์ในการตัดสินใจ (สามารถแก้ตัวเลขตรงนี้ได้)
        // Scalper: ถือเฉลี่ยน้อยกว่า 30 นาที (1800 วิ) และไม่ค่อยห่อข้ามคืน
        if (avgHoldingSeconds <= 1800 && overnightRatio < 0.1) {
            return "Scalper";
        }
        // Day Trader: ถือเฉลี่ยน้อยกว่า 1 วันทำการ (สมมติ < 12 ชม.)
        // และห่อข้ามคืนน้อยกว่า 20%
        else if (avgHoldingSeconds <= 43200 && overnightRatio <= 0.2) {
            return "Day Trader";
        }
        // Swing Trader: ถือเฉลี่ยเกิน 1 วัน แต่ไม่เกิน 3 สัปดาห์ (1814400 วิ)
        else if (avgHoldingSeconds <= 1814400) {
            return "Swing Trader";
        }
        // Position Trader: ถือยาวกว่า 3 สัปดาห์
        else {
            return "Position Trader";
        }
    }

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
        return switch (traderType) {
            case "Scalper" -> category.equalsIgnoreCase("SPECULATIVE") || category.equalsIgnoreCase("HIGH_VOLATILITY");
            case "Day Trader" -> category.equalsIgnoreCase("TRENDING") || category.equalsIgnoreCase("SPECULATIVE");
            case "Swing Trader" -> category.equalsIgnoreCase("SWING") || category.equalsIgnoreCase("TRENDING");
            case "Position Trader" -> category.equalsIgnoreCase("STABLE") || category.equalsIgnoreCase("BLUECHIP") || category.equalsIgnoreCase("DIVIDEND");
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

    private UserAnalyticsResult performDeepAnalytics(String statedType, String actualBehaviorType, List<TradeExecutionRecord> trades) {
        UserAnalyticsResult result = new UserAnalyticsResult();
        result.setTraderType(statedType); // ยึดตามที่ User เลือกไว้ก่อน
        result.setTotalClosedTrades(trades.size());

        if (trades.isEmpty()) return result;

        // --- 1. คำนวณ Performance Metrics ---
        int winCount = 0;
        int lossCount = 0;
        double sumWinPct = 0.0;
        double sumLossPct = 0.0;
        double totalPnL = 0.0;

        for (TradeExecutionRecord t : trades) {
            double pnl = t.getRealizedProfitPercentage().doubleValue();
            totalPnL += pnl;
            if (pnl > 0) {
                winCount++;
                sumWinPct += pnl;
            } else if (pnl < 0) {
                lossCount++;
                sumLossPct += Math.abs(pnl);
            }
        }

        double winRate = ((double) winCount / trades.size()) * 100;
        double avgWin = winCount > 0 ? sumWinPct / winCount : 0.0;
        double avgLoss = lossCount > 0 ? sumLossPct / lossCount : 0.0;
        double riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin;

        calculateHighlights(result, trades);

        //บันทึกลง database
        result.setWinRate(winRate);
        result.setTotalRealizedPnL(totalPnL);
        result.setAverageWinPct(avgWin);
        result.setAverageLossPct(avgLoss);
        result.setRiskRewardRatio(riskReward);

        // --- 2. หา "หุ้นกลุ่มหลัก" ที่เล่น (Predominant Category) ---
        Map<String, Long> categoryCount = trades.stream()
                .collect(Collectors.groupingBy(TradeExecutionRecord::getCategory, Collectors.counting()));
        String predominantCategory = categoryCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("UNKNOWN");

        // --- 3. ตรวจสอบความสอดคล้อง (Consistency Check) ---

        // Check 1: หุ้นที่เล่น ตรงกับ Type ที่ระบุไว้ไหม?
        boolean isStockMatched = checkStyleMatch(statedType, predominantCategory);

        // Check 2: พฤติกรรมการถือยาว/สั้น (Actual) ตรงกับ Type ที่ระบุไว้ (Stated) ไหม?
        boolean isBehaviorMatched = statedType.equalsIgnoreCase(actualBehaviorType);
        boolean isProfitable = (totalPnL > 0) || (winRate > 50.0);

        result.setStyleMatched(isStockMatched && isBehaviorMatched);
        result.setProfitable(isProfitable);

        generateRecommendation(result, statedType, actualBehaviorType, predominantCategory, isStockMatched, isBehaviorMatched, isProfitable);

        return result;
    }

    private void generateRecommendation(UserAnalyticsResult result, String statedType, String actualType, String stockCat, boolean stockMatch, boolean behaviorMatch, boolean profitable) {
        if (stockMatch && behaviorMatch) {
            if (profitable) {
                result.setPrimaryFeedback("ยอดเยี่ยม! (Perfect Alignment)");
                result.setRecommendation(String.format("คุณทำได้ตามแผน %s ทั้งหุ้นกลุ่ม %s และระยะเวลาถือครอง", statedType, stockCat));
            } else {
                result.setPrimaryFeedback("มาถูกทางแล้ว แต่ต้องปรับจังหวะ (Execution Issue)");
                result.setRecommendation("สไตล์ถูกต้องแต่ผลลัพธ์ยังติดลบ ให้โฟกัสที่ Technical Analysis และจุดเข้าออก");
            }
        } else if (!behaviorMatch && profitable) {
            result.setPrimaryFeedback("ค้นพบตัวตนใหม่! (New Strength Discovered)");
            result.setRecommendation(String.format("คุณระบุว่าเป็น %s แต่กำไรจากการเทรดแบบ %s แนะนำให้เปลี่ยน Profile", statedType, actualType));
            result.setSuggestedTraderType(actualType);
        } else if (!stockMatch) {
            result.setPrimaryFeedback("เล่นหุ้นผิดประเภท (Wrong Asset Class)");
            String suggested = getTraderTypeFromCategory(stockCat);
            if (profitable) {
                result.setRecommendation(String.format("คุณกำไรจากหุ้น %s ซึ่งเหมาะกับสาย %s มากกว่า", stockCat, suggested));
                result.setSuggestedTraderType(suggested);
            } else {
                result.setRecommendation(String.format("คุณเป็น %s แต่เล่นหุ้น %s ซึ่งผิดธรรมชาติ ควรกลับมาเล่นหุ้นตรงสาย", statedType, stockCat));
            }
        } else {
            result.setPrimaryFeedback("สับสนทิศทาง (No Clear Strategy)");
            result.setRecommendation("พฤติกรรมไม่ชัดเจนและขาดทุน ควรหยุดเทรดและทบทวนความรู้พื้นฐาน");
        }
    }

    private String getTraderTypeFromCategory(String category) {
        if (category.equalsIgnoreCase("SPECULATIVE") || category.equalsIgnoreCase("HIGH_VOLATILITY")) return "Scalper";
        if (category.equalsIgnoreCase("TRENDING")) return "Day Trader";
        if (category.equalsIgnoreCase("SWING")) return "Swing Trader";
        return "Position Trader"; // STABLE, BLUECHIP
    }

    private void applyRecommendationMatrix(UserAnalyticsResult result, boolean isStyleMatched, boolean isProfitable,
            String category) {
        String type = result.getTraderType();
        double rrRatio = result.getRiskRewardRatio();

        // Matrix Case 1: เล่นหุ้นถูกสาย + กำไร (True, True) -> ไปต่อ
        if (isStyleMatched && isProfitable) {
            result.setPrimaryFeedback("ยอดเยี่ยม! (Perfect Alignment)");
            result.setRecommendation(String.format(
                    "พฤติกรรมของคุณคือ %s และคุณเลือกหุ้นกลุ่ม %s ซึ่ง 'ถูกต้องและเหมาะสม' ผลลัพธ์ของคุณคือกำไร " +
                            "คำแนะนำ: ให้คุณรักษาวินัยนี้ไว้ (Keep going) " +
                            "และอาจพิจารณาเพิ่มขนาดการลงทุน (Position Sizing) ในจังหวะที่มั่นใจ",
                    type, category));
        }

        // Matrix Case 2: เล่นหุ้นถูกสาย + ขาดทุน (True, False) ->
        // ไปต่อสายนี้แต่ฝึกฝีมือ
        else if (isStyleMatched && !isProfitable) {
            result.setPrimaryFeedback("มาถูกทาง แต่ขาดจังหวะเข้าทำ (Right Style, Poor Execution)");

            // วิเคราะห์ย่อยเพื่อเจาะจงปัญหา
            String deeperAdvice = "";
            if (rrRatio < 1.0) {
                deeperAdvice = "ปัญหาหลักของคุณคือเวลาได้กำไรได้น้อย แต่เวลาเสียเสียหนัก แนะนำให้ฝึกตั้ง Stop-Loss ให้เข้มงวดขึ้น";
            } else {
                deeperAdvice = "คุณอาจจะเข้าซื้อถูกตัว แต่เข้าผิดจังหวะ (ไล่ราคา) ลองศึกษาแนวรับ-แนวต้านเพิ่มเติม";
            }

            result.setRecommendation(String.format(
                    "คุณเลือกหุ้น %s ซึ่งเหมาะกับความเป็น %s ของคุณแล้ว ไม่ต้องเปลี่ยนกลุ่มหุ้น! " +
                            "แต่ที่ขาดทุนเกิดจากทักษะการเทรด คำแนะนำ: %s",
                    category, type, deeperAdvice));
        }

        // Matrix Case 3: เล่นหุ้นผิดสาย + กำไร (False, True) -> อันตรายในระยะยาว
        else if (!isStyleMatched && isProfitable) {
            result.setPrimaryFeedback("ดวงดี หรือ พฤติกรรมเริ่มเบี่ยงเบน (Style Drift Warning)");

            String suggestedCat = getSuggestedCategory(type);
            result.setRecommendation(String.format(
                    "คุณมีพฤติกรรมเป็น %s แต่ระยะหลังคุณไปทำกำไรในหุ้นกลุ่ม %s ซึ่งถือว่ามีความเสี่ยง (Mismatch) " +
                            "แม้ตอนนี้จะได้กำไร แต่มันอาจเป็นเพียงรอบสั้นๆ ของตลาด คำแนะนำ: ลองพิจารณากลับมาเทรดหุ้นกลุ่ม %s "
                            +
                            "เพื่อความสม่ำเสมอในระยะยาว",
                    type, category, suggestedCat));
        }

        // Matrix Case 4: เล่นหุ้นผิดสาย + ขาดทุน (False, False) -> ต้องปรับปรุงด่วน
        else {
            result.setPrimaryFeedback("วิกฤต! เล่นผิดประเภทและขาดทุน (Total Mismatch)");

            String suggestedCat = getSuggestedCategory(type);
            result.setRecommendation(String.format(
                    "ผลขาดทุนของคุณเกิดจากการฝืนธรรมชาติ คุณเป็นคนสไตล์ %s ซึ่งไม่ควรไปเล่นหุ้นกลุ่ม %s " +
                            "คำแนะนำ: หยุดเทรดชั่วคราว ทบทวนตัวเอง และเมื่อพร้อมให้กลับมาเริ่มใหม่กับหุ้นกลุ่ม %s เท่านั้น",
                    type, category, suggestedCat));
        }
    }
    //วิเคราะห์พฤติกรมมเสี่ยง
    private void analyzeRiskBehaviors(UserAnalyticsResult result, List<TradeExecutionRecord> trades, List<OrderHistory> allOrders) {
        if (trades.isEmpty() && allOrders.isEmpty()) return;
        // 1. กำหนด Rolling Window (วิเคราะห์แค่ 50 รายการล่าสุด)
        final int RECENT_WINDOW = 50;
        // --- จุดแก้ไขที่ 1: จำกัดข้อมูลแค่ 50 ไม้ล่าสุด และกลับด้านให้อ่านจากเก่าไปใหม่ ---
        List<TradeExecutionRecord> recentTrades = trades.stream()
                .limit(RECENT_WINDOW)
                .collect(Collectors.toList());
        Collections.reverse(recentTrades);

        List<OrderHistory> recentOrders = allOrders.stream()
                .limit(RECENT_WINDOW * 2) // ออเดอร์มีทั้ง Buy/Sell เลยดึงเผื่อไว้
                .collect(Collectors.toList());
        Collections.reverse(recentOrders);

        // --- จุดแก้ไขที่ 2: เปลี่ยนจากการนับจำนวน (Count) เป็นคะแนน (Score) เริ่มที่ 0 ---
        double fomoScore = 0.0;
        double panicScore = 0.0;
        double earlySellScore = 0.0;
        double holdLoserScore = 0.0;

        // 2. วิเคราะห์จากประวัติไม้ที่ปิดไปแล้ว (Closed Trades)
        for (TradeExecutionRecord t : recentTrades) {
            double pnl = t.getRealizedProfitPercentage().doubleValue();
            long holdingHours = t.getHoldingPeriod().toHours();
            long holdingDays = t.getHoldingPeriod().toDays();

            // อาการขายหุ้นที่ได้กำไรเร็วเกินไป (Selling Winners Too Early)
            if (!"Scalper".equalsIgnoreCase(result.getTraderType())) {
                if (pnl > 0 && pnl < 2.0 && holdingHours < 24) {
                    earlySellScore += 15.0;  // อาการกำเริบ: เพิ่มคะแนนความเสี่ยง
                } else if (pnl > 5.0 && holdingHours > 48) {
                    earlySellScore -= 10.0;  // ทำได้ดี: ทนรวยได้ ลบคะแนนความเสี่ยง
                }
            }

            // อาการถือหุ้นที่ขาดทุนนานเกินไป (Holding Losers Too Long)
            if (pnl <= -10.0 && holdingDays > 14) {
                holdLoserScore += 20.0; // อาการกำเริบ: ทนดอยจนพัง เพิ่มคะแนนรุนแรง
            } else if (pnl < 0 && pnl >= -5.0 && holdingDays <= 3) {
                holdLoserScore -= 10.0; // ทำได้ดี: ยอม Cut Loss ไว ลบคะแนนให้
            }

            // --- จุดแก้ไขที่ 3: คุมคะแนนให้อยู่ในกรอบ 0 - 100 เสมอ ---
            earlySellScore = Math.max(0, Math.min(100, earlySellScore));
            holdLoserScore = Math.max(0, Math.min(100, holdLoserScore));
        }

        // 3. วิเคราะห์จากจังหวะการเข้าออกออเดอร์ (Order Level)
        for (OrderHistory order : recentOrders) {
            // *** จำเป็นต้องดึงข้อมูลตลาด ณ เวลานั้นมาประกอบ ***
            double rsi = getMarketRsiAtTime(order.getSymbol(), order.getFilledAt());
            double priceChangePct = getPriceChangeBeforeTrade(order.getSymbol(), order.getFilledAt());

            if ("buy".equalsIgnoreCase(order.getSide())) {
                // อาการกลัวพลาดโอกาส (FOMO)
                if (priceChangePct > 5.0 && rsi > 70.0) {
                    fomoScore += 15.0; // ไล่ซื้อยอดดอย เพิ่มคะแนน
                } else if (rsi < 45.0) {
                    fomoScore -= 10.0; // ซื้อตอนราคาย่อตัว ถือว่าทำได้ดี ลบคะแนน
                }
                fomoScore = Math.max(0, Math.min(100, fomoScore));

            } else if ("sell".equalsIgnoreCase(order.getSide())) {
                // อาการขายแบบตื่นตระหนก (Panic Sell)
                if (priceChangePct < -5.0 && rsi < 30.0) {
                    panicScore += 15.0; // ตกใจขายทิ้งก้นเหว เพิ่มคะแนน
                } else if (rsi > 55.0) {
                    panicScore -= 10.0; // ขายทำกำไรปกติ ลบคะแนน
                }
                panicScore = Math.max(0, Math.min(100, panicScore));
            }
        }

        // --- จุดแก้ไขที่ 4: บันทึกผลลง Result เลย (ไม่ต้องเอาไปหาร Total แล้ว เพราะเป็น Score 0-100 โดยตรง) ---
        result.setFomoScore(fomoScore);
        result.setFomoStatus(evaluateRiskLevel(fomoScore));

        result.setPanicSellScore(panicScore);
        result.setPanicSellStatus(evaluateRiskLevel(panicScore));

        result.setSellingWinnersTooEarlyScore(earlySellScore);
        result.setSellingWinnersTooEarlyStatus(evaluateRiskLevel(earlySellScore));

        result.setHoldingLosersTooLongScore(holdLoserScore);
        result.setHoldingLosersTooLongStatus(evaluateRiskLevel(holdLoserScore));

        generateBehavioralFeedback(result);
    }

    private String evaluateRiskLevel(double score) {
        if (score >= 80.0) return "พฤติกรรมเสี่ยง";
        if (score >= 60.0) return "มีแนวโน้ม";
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
            feedbacks.add("คุณขายหมูบ่อยเกินไป (Selling Winners Too Early) รีบขายทั้งที่เทรนด์ยังไปต่อได้ ทำให้ Risk/Reward ไม่คุ้มค่า");
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

            List<StockBar> bars = marketDataService.getHistoricalBars(symbol, startTime, tradeTime, "1Hour");

            if (bars.size() < 15) return 50.0; // ข้อมูลไม่พอคำนวณ RSI

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

            List<StockBar> bars = marketDataService.getHistoricalBars(symbol, startTime, tradeTime, "1Hour");

            if (bars.isEmpty()) return 0.0;

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

            if (prevPrice == 0) return 0.0;

            // สูตร: ((ราคาปัจจุบัน - ราคาเก่า) / ราคาเก่า) * 100
            return ((currentPrice - prevPrice) / prevPrice) * 100.0;

        } catch (Exception e) {
            System.err.println("Error calculating Price Change: " + e.getMessage());
            return 0.0;
        }
    }

    // สูตรคำนวณ RSI มาตรฐาน
    private double calculateRSI(List<StockBar> bars, int period) {
        if (bars.size() <= period) return 50.0;

        double avgGain = 0.0;
        double avgLoss = 0.0;

        // คำนวณ RSI รอบแรก
        for (int i = 1; i <= period; i++) {
            double change = bars.get(i).getC() - bars.get(i - 1).getC();
            if (change > 0) avgGain += change;
            else avgLoss += Math.abs(change);
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

        if (avgLoss == 0) return 100.0; // กำไรล้วน
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
        if (trades.isEmpty()) return;

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
                        Collectors.summingDouble(t -> t.getRealizedProfitPercentage().doubleValue())
                ));

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
                    if (days > 0) durationText = String.format("%d วัน %d ชม.", days, hours);
                    else if (hours > 0) durationText = String.format("%d ชม. %d นาที", hours, minutes);
                    else durationText = String.format("%d นาที", minutes);

                    result.setLongestHeldDuration(durationText);
                });
    }

    private TradeExecutionRecord createTradeRecord(OrderHistory openOrder, OrderHistory closeOrder, BigDecimal qty, String category) {
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
}
