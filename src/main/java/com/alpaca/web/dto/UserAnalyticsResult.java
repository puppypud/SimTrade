package com.alpaca.web.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

@Data
public class UserAnalyticsResult {

    private String traderType;         // ประเภทนักเทรด เช่น Scalper, Day Trader
    private String suggestedTraderType;  // สายที่ระบบแนะนำให้เปลี่ยน
    private int totalClosedTrades;     // จำนวนไม้ที่เทรดจบแล้ว (ซื้อและขายครบ)
    private String primaryFeedback;    // สรุปผลลัพธ์สั้นๆ (หัวข้อ)
    private String recommendation;     // คำแนะนำแบบยาว

    // ข้อมูล Performance Metrics เบื้องต้น
    private double winRate;            // อัตราการชนะ (%)
    private double totalRealizedPnL;   // กำไร/ขาดทุนสุทธิรวม (%)
    private double averageWinPct;      // กำไรเฉลี่ยต่อไม้ที่ชนะ (%)
    private double averageLossPct;     // ขาดทุนเฉลี่ยต่อไม้ที่แพ้ (%)
    private double riskRewardRatio;    // สัดส่วน Risk:Reward (ควร > 1.0)

    // ข้อมูลสำหรับ Rule Engine (True/False)
    private boolean styleMatched;      // True = เล่นหุ้นถูกประเภทสายเทรด (Lombok จะสร้างเมธอด setStyleMatched() ให้)
    private boolean profitable;        // True = ภาพรวมมีกำไร (Lombok จะสร้างเมธอด setProfitable() ให้)

    // --- ข้อมูล Behavioral Risk Analysis ---
    private double fomoScore;
    private String fomoStatus; // "ปกติ", "มีแนวโน้ม", "พฤติกรรมเสี่ยง"

    private double sellingWinnersTooEarlyScore;
    private String sellingWinnersTooEarlyStatus;

    private double holdingLosersTooLongScore;
    private String holdingLosersTooLongStatus;

    private double panicSellScore;
    private String panicSellStatus;

    // จำนวนครั้งที่ระบบจับได้และแจ้งเตือน (Popup)
    private int fomoCount;
    private int panicSellCount;
    private int sellingWinnersTooEarlyCount;
    private int holdingLosersTooLongCount;

    // คำแนะนำเพิ่มเติมสำหรับพฤติกรรมเสี่ยง
    private String behavioralFeedback;

    private String mostTradedStock;         // หุ้นที่เทรดบ่อยสุด
    private long mostTradedStockCount;      // จำนวนครั้งที่เทรด

    private String bestPerformingStock;     // หุ้นที่ทำกำไร(รวม)สูงสุด
    private double bestPerformingStockPnL;  // กำไร(%) รวมของตัวนี้
    private String bestPerformingStockIndustry; // อุตสาหกรรมของหุ้นตัวนี้

    private String worstPerformingStock;    // หุ้นที่ขาดทุน(รวม)หนักสุด
    private double worstPerformingStockPnL; // ขาดทุน(%) รวมของตัวนี้

    private String longestHeldStock;        // หุ้นที่ถือครองนานสุด (ไม้เดียว)
    private String longestHeldDuration;     // ข้อความระบุเวลา เช่น "5 วัน 2 ชม."

    private String sizingFeedback;        // เช่น "อันตราย! คุณมักจะลงเงินหนักในไม้ที่ขาดทุน (Over-betting on losers)"
    private double profitFactor;          // Gross Profit / Gross Loss (ค่ามาตรฐานโลก: > 1.5 คือดี)
    private String profitFactorFeedback;  // คำอธิบาย Profit Factor

    // 2. Diversification (การกระจายหุ้น)
    private String diversificationFeedback; // เช่น "คุณกระจุกตัวอยู่กับหุ้น TSLA เกิน 60% ของพอร์ต (Obsession Risk)"
    private int maxConsecutiveWins;       // ชนะติดกันสูงสุด
    private int maxConsecutiveLosses;     // แพ้ติดกันสูงสุด
    private String streakFeedback;        // เช่น "ระวัง! คุณแพ้ติดกัน 5 ไม้แล้ว หยุดพักก่อนไหม (Cool-down required)"

    //แนะนำหุ้น ที่หรงกับผู้เทรด
    private List<String> recommendedSimilarStocks;   //รายชื่อหุ้นที่แนะนำ (Legacy/Fallback)
    private List<String> recommendedIndustryStocks;  // 3.1 หุ้นในอุตสาหกรรมเดียวกับตัวที่ทำกำไรดีที่สุด
    private List<String> recommendedNewTypeStocks;   // 3.2 หุ้นสำหรับสายใหม่ที่ระบบแนะนำ
    private List<String> recommendedCurrentTypeStocks; // 3.3 หุ้นสำหรับสายเดิมของผู้เล่น
}
