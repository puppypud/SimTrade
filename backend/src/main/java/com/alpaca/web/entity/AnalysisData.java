package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "analysis_data", indexes = {
        @Index(name = "idx_analysis_user_id",   columnList = "user_id"),
        @Index(name = "idx_analysis_alert_type", columnList = "alert_type"),
        @Index(name = "idx_analysis_created_at", columnList = "created_at")
})
public class AnalysisData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                                    // PK

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount userAccount;                    // FK ผู้ใช้งาน

    @Column(name = "symbol", length = 20)
    private String symbol;                              // หุ้นที่เกิดเหตุ

    @Column(name = "alert_type", nullable = false, length = 50)
    private String alertType;                           // ประเภท Alert

    @Column(name = "severity", nullable = false, length = 20)
    private String severity;                            // ความรุนแรง

    @Column(name = "price_change_percent")
    private Double priceChangePercent;                  // % ราคาตลาดตอนนั้น

    @Column(name = "profit_percent")
    private Double profitPercent;                       // % กำไรพอร์ตตอนนั้น

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;                             // ข้อความจาก AI

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;                    // เวลาที่บันทึก

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // In-memory Feedback Config (ใช้ในทางโปรแกรมมิ่ง)
    public static class FeedbackTemplateDTO {
        public String title;
        public String message;
        public String severity;
        public FeedbackTemplateDTO(String title, String message, String severity) {
            this.title = title; this.message = message; this.severity = severity;
        }
    }

    public static java.util.Map<String, FeedbackTemplateDTO> feedbackConfig =
            new java.util.concurrent.ConcurrentHashMap<>();

    static {
        feedbackConfig.put("FOMO_ALERT", new FeedbackTemplateDTO(
                "อาการ: กลัวตกรถ (FOMO)",
                "ตรวจพบพฤติกรรมไล่ราคา (FOMO) มีการส่งคำสั่งซื้อถี่เกินไปในขณะที่ราคากำลังพุ่งสูง (สะสมความเสี่ยง +15 คะแนน)",
                "WARNING"));
        feedbackConfig.put("SELL_EARLY_ALERT", new FeedbackTemplateDTO(
                "อาการ: รีบขายหมู (Sell Early)",
                "ตรวจพบพฤติกรรมรีบขายทำกำไรก่อนถึงเป้าหมายที่วางไว้ (สะสมความเสี่ยง +15 คะแนน)",
                "INFO"));
        feedbackConfig.put("PANIC_SELL_ALERT", new FeedbackTemplateDTO(
                "อาการ: ตื่นตระหนก (Panic Sell)",
                "ตรวจพบพฤติกรรมตื่นตระหนกเทขายหุ้นสัดส่วนสูงในขณะที่ราคาร่วงลงรุนแรง (สะสมความเสี่ยง +15 คะแนน)",
                "DANGER"));
        feedbackConfig.put("HOLDING_LOSERS_ALERT", new FeedbackTemplateDTO(
                "อาการ: ทนถือขาดทุน (Hold Losers)",
                "ตรวจพบพฤติกรรมทนถือหุ้นที่ขาดทุนหนักเป็นเวลานานเกินไป ควรตั้งจุด Cut Loss (สะสมความเสี่ยง +20 คะแนน)",
                "WARNING"));
    }
}
