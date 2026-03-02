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
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class UserAnalyticsService {
    private final OrderHistoryRepository orderRepository;
    private final StockAssetRepository stockAssetRepository;
    private AlpacaAPI brokerAPI;
    private final AccountRepository accountRepository;
    private double totalRealizedPnL; // กำไร/ขาดทุนสุทธิรวม
    private double averageWinPct; // กำไรเฉลี่ยต่อไม้ (%)
    private double averageLossPct; // ขาดทุนเฉลี่ยต่อไม้ (%)
    private double riskRewardRatio; // สัดส่วน Risk:Reward (ควร > 1.0)
    private boolean isStyleMatched; // True = เล่นหุ้นถูกประเภทสายเทรด
    private boolean isProfitable; // True = ภาพรวมมีกำไร (Win Rate > 50 หรือ PnL > 0)

    Dotenv dotenv = Dotenv.load();

    public UserAnalyticsService(OrderHistoryRepository orderRepository, StockAssetRepository stockAssetRepository,
            AccountRepository accountRepository) {
        this.orderRepository = orderRepository;
        this.stockAssetRepository = stockAssetRepository;
        this.accountRepository = accountRepository;
    }

    public UserAnalyticsResult analyzeUserBehavior(Long userId) {
        // 1. ดึงออเดอร์ที่ 'FILLED' ทั้งหมดของผู้ใช้ เรียงตามเวลาเก่าไปใหม่
        List<OrderHistory> orders = orderRepository.findByUserAccount_IdOrderByFilledAtDesc(userId)
                .stream()
                .filter(o -> "filled".equalsIgnoreCase(o.getStatus()))
                .sorted(Comparator.comparing(OrderHistory::getFilledAt))
                .collect(Collectors.toList());

        if (orders.isEmpty()) {
            UserAnalyticsResult emptyResult = new UserAnalyticsResult();
            emptyResult.setTraderType("Newbie");
            emptyResult.setPrimaryFeedback("ยังไม่มีข้อมูลการเทรดที่สมบูรณ์เพียงพอ");
            return emptyResult;
        }

        // 2. จับคู่ Buy/Sell ด้วย FIFO (รวบรัดสำหรับใช้คำนวณเบื้องต้น)
        List<TradeExecutionRecord> closedTrades = matchTradesFIFO(orders);

        String traderType = classifyTraderType(closedTrades);

        // 3. วิเคราะห์เชิงลึกและส่งผลลัพธ์กลับ
        UserAnalyticsResult result = performDeepAnalytics(traderType, closedTrades);

        // 4. วิเคราะห์พฤติกรรมเสี่ยง (แทรกเพิ่มตรงนี้)
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
            Queue<OrderHistory> buyQueue = new LinkedList<>();

            // ดึง Category ของหุ้นมาเตรียมไว้
            String stockCategory = stockAssetRepository.findById(symbol)
                    .map(StockAsset::getCategory)
                    .orElse("UNKNOWN");

            for (OrderHistory order : entry.getValue()) {
                if ("buy".equalsIgnoreCase(order.getSide())) {
                    buyQueue.add(order);
                } else if ("sell".equalsIgnoreCase(order.getSide()) && !buyQueue.isEmpty()) {
                    // ดึง Buy ล่าสุดมาจับคู่ (สมมติฐานว่าขายหมดในไม้เดียวเพื่อความง่าย
                    // ถ้ามืออาชีพต้องตัด Qty ทีละส่วน)
                    OrderHistory matchedBuy = buyQueue.poll();

                    TradeExecutionRecord record = new TradeExecutionRecord();
                    record.setSymbol(symbol);
                    record.setCategory(stockCategory);

                    // คำนวณระยะเวลาถือครอง
                    record.setHoldingPeriod(Duration.between(matchedBuy.getFilledAt(), order.getFilledAt()));

                    // เช็คว่าถือข้ามคืนไหม (เทียบวันตามเวลา US Eastern Time - ตลาดหุ้นเมกา)
                    LocalDate buyDate = matchedBuy.getFilledAt().atZone(ZoneId.of("America/New_York")).toLocalDate();
                    LocalDate sellDate = order.getFilledAt().atZone(ZoneId.of("America/New_York")).toLocalDate();
                    record.setOvernight(!buyDate.isEqual(sellDate));

                    // คำนวณ % PnL ( [Sell Price - Buy Price] / Buy Price )
                    BigDecimal buyPrice = matchedBuy.getFilledAvgPrice();
                    BigDecimal sellPrice = order.getFilledAvgPrice();
                    if (buyPrice.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal pnlPct = sellPrice.subtract(buyPrice)
                                .divide(buyPrice, 4, RoundingMode.HALF_UP)
                                .multiply(new BigDecimal("100"));
                        record.setRealizedProfitPercentage(pnlPct);
                    } else {
                        record.setRealizedProfitPercentage(BigDecimal.ZERO);
                    }

                    closedTrades.add(record);
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
            case "Position Trader" -> category.equalsIgnoreCase("STABLE") || category.equalsIgnoreCase("BLUECHIP")
                    || category.equalsIgnoreCase("DIVIDEND");
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

    private UserAnalyticsResult performDeepAnalytics(String traderType, List<TradeExecutionRecord> trades) {
        UserAnalyticsResult result = new UserAnalyticsResult();
        result.setTraderType(traderType);
        result.setTotalClosedTrades(trades.size());

        if (trades.isEmpty())
            return result;

        // 1. คำนวณ Performance Metrics เบื้องต้น
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
                sumLossPct += Math.abs(pnl); // เก็บค่าบวกเพื่อไปหาค่าเฉลี่ย
            }
        }

        double winRate = ((double) winCount / trades.size()) * 100;
        double avgWin = winCount > 0 ? sumWinPct / winCount : 0.0;
        double avgLoss = lossCount > 0 ? sumLossPct / lossCount : 0.0;
        double riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin; // ถ้าไม่เคยแพ้เลยให้ใช้ avgWin

        // บันทึกค่า Analytics
        result.setWinRate(winRate);
        result.setTotalRealizedPnL(totalPnL);
        result.setAverageWinPct(avgWin);
        result.setAverageLossPct(avgLoss);
        result.setRiskRewardRatio(riskReward);

        // 2. วิเคราะห์หา "พฤติกรรมหลัก" (Dominant Behavior)
        // หาว่าส่วนใหญ่เทรดหุ้น Category ไหน
        Map<String, Long> categoryCount = trades.stream()
                .collect(Collectors.groupingBy(TradeExecutionRecord::getCategory, Collectors.counting()));
        String predominantCategory = categoryCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("UNKNOWN");

        // 3. ตั้งค่า Rule Engine (True / False)
        // กฎที่ 1: สไตล์การเทรด เข้ากับ หุ้นที่เลือกเล่นหรือไม่?
        boolean isStyleMatched = checkStyleMatch(traderType, predominantCategory);

        // กฎที่ 2: มีกำไรหรือไม่? (ดูจาก PnL รวม หรือ WinRate > 50%)
        boolean isProfitable = (totalPnL > 0) || (winRate >= 50.0);

        result.setStyleMatched(isStyleMatched);
        result.setProfitable(isProfitable);

        // 4. เข้าสู่ Matrix การแนะนำ (Recommendation Engine)
        applyRecommendationMatrix(result, isStyleMatched, isProfitable, predominantCategory);

        return result;
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
        // TODO: ในงานจริง ต้องไปดึงข้อมูล K-Line จาก AlpacaMarketDataAPI ก่อนหน้า 'time' 14 วัน/ชั่วโมง มาคำนวณ RSI
        // คืนค่าจำลองไปก่อน เพื่อให้ระบบทำงานได้
        return 50.0;
    }

    private double getPriceChangeBeforeTrade(String symbol, java.time.Instant time) {
        // TODO: ในงานจริง ต้องคำนวณ % เปลี่ยนแปลงของราคา (เช่น ใน 24 ชั่วโมงที่ผ่านมา)
        // คืนค่าจำลองไปก่อน
        return 0.0;
    }
}
