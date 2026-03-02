package com.alpaca.web.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Duration;

@Data
public class UserAnalyticsResult {

    private String traderType;         // ประเภทนักเทรด เช่น Scalper, Day Trader
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

    // คำแนะนำเพิ่มเติมสำหรับพฤติกรรมเสี่ยง
    private String behavioralFeedback;
}
