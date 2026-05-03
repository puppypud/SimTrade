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

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
