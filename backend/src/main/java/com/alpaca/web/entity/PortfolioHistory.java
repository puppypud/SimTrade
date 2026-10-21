package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "portfolio_history")
@Getter
@Setter
public class PortfolioHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId; // เชื่อมกับ UserAccount

    // มูลค่ารวมทั้งหมด (เงินสด + มูลค่าหุ้น)
    @Column(name = "total_portfolio_value", precision = 15, scale = 2)
    private BigDecimal totalPortfolioValue;

    @Column(name = "buying_power", precision = 15, scale = 2)
    private BigDecimal buyingPower;

    @Column(name = "cash_balance", precision = 15, scale = 2)
    private BigDecimal cashBalance;

    @Column(name = "total_stock_value", precision = 15, scale = 2)
    private BigDecimal totalStockValue;

    // กำไร/ขาดทุนรวมที่ยังไม่ได้ขาย
    @Column(name = "unrealized_pnl", precision = 15, scale = 2)
    private BigDecimal unrealizedPnl;

    @Column(name = "daily_return_percent", precision = 10, scale = 4)
    private BigDecimal dailyReturnPercent;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        this.recordedAt = LocalDateTime.now();
    }
}
