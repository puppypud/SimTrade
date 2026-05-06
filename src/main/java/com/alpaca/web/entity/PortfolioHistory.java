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
    private Long id; // แก้เป็น Long

    @Column(name = "user_id", nullable = false)
    private Long userId; // แก้เป็น Long ให้ตรงกับ UserAccount

    @Column(name = "total_portfolio_value", precision = 15, scale = 2)
    private BigDecimal totalPortfolioValue;

    @Column(name = "buying_power", precision = 15, scale = 2)
    private BigDecimal buyingPower;

    @Column(name = "cash_balance", precision = 15, scale = 2)
    private BigDecimal cashBalance;

    @Column(name = "total_stock_value", precision = 15, scale = 2)
    private BigDecimal totalStockValue;

    @Column(name = "unrealized_pnl", precision = 15, scale = 2)
    private BigDecimal unrealizedPnl;

    @Column(name = "daily_return_percent", precision = 5, scale = 2)
    private BigDecimal dailyReturnPercent;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        this.recordedAt = LocalDateTime.now();
    }
}
