package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "AnalysisData") // ชื่อตารางตามที่คุณต้องการ
public class AnalysisData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔗 เชื่อมกับ UserAccount (ใครเป็นคนทำพฤติกรรมนี้)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount userAccount;

    @Column(name = "symbol", nullable = false, length = 10)
    private String symbol;

    @Column(name = "alert_type", nullable = false, length = 50)
    private String alertType; // เช่น FOMO_ALERT, PANIC_SELL_ALERT, SELL_EARLY_ALERT

    @Column(name = "message", columnDefinition = "TEXT")
    private String message; // เก็บข้อความแจ้งเตือนไว้ดูย้อนหลัง

    @Column(name = "severity", length = 20)
    private String severity; // WARNING, DANGER, INFO

    // --- ข้อมูลบริบท ณ ตอนที่เกิดเหตุ (เอาไว้วิเคราะห์เชิงลึก) ---
    @Column(name = "price_change_percent")
    private Double priceChangePercent;

    @Column(name = "profit_percent")
    private Double profitPercent;

    @Column(name = "volume_sold_percent")
    private Double volumeSoldPercent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ==========================================
    // IN-MEMORY CONFIGURATION (แทนการสร้างตารางใหม่)
    // ==========================================
    public static class FeedbackTemplateDTO {
        public String title;
        public String message;
        public String severity;
        public FeedbackTemplateDTO(String t, String m, String s) { this.title=t; this.message=m; this.severity=s; }
    }

    public static java.util.Map<String, FeedbackTemplateDTO> feedbackConfig = new java.util.concurrent.ConcurrentHashMap<>();
    
    static {
        feedbackConfig.put("FOMO_ALERT", new FeedbackTemplateDTO("อาการ: กลัวตกรถ (FOMO)", "ตรวจพบพฤติกรรมไล่ราคา (FOMO) เนื่องจากมีการส่งคำสั่งซื้อถี่เกินไปในขณะที่ราคากำลังพุ่งสูง", "WARNING"));
        feedbackConfig.put("SELL_EARLY_ALERT", new FeedbackTemplateDTO("อาการ: รีบขายหมู (Sell Early)", "ตรวจพบพฤติกรรมรีบขายทำกำไร (Sell Early) ก่อนถึงเป้าหมายที่วางไว้", "INFO"));
        feedbackConfig.put("PANIC_SELL_ALERT", new FeedbackTemplateDTO("อาการ: ตื่นตระหนก (Panic Sell)", "ตรวจพบพฤติกรรมตื่นตระหนก (Panic Sell) โดยการเทขายหุ้นสัดส่วนสูงในขณะที่ราคาร่วงลงรุนแรง", "DANGER"));
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
