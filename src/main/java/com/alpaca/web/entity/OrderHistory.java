package com.alpaca.web.entity;

import java.math.BigDecimal;
import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "OrderHistory")
public class OrderHistory {
    @Id
    @Column(name = "order_id", updatable = false, nullable = false)
    private String orderId; // แก้ไขได้: ถ้าอยากให้ DB gen ID เอง ให้แยก id ออกมาเป็น Auto Increment และเก็บ orderId เป็น Unique Column

    // ชี้กลับไปที่ UserAccount ของคุณ
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount userAccount;

    @Column(name = "symbol", nullable = false, length = 10)
    private String symbol;

    @Column(name = "asset_class", length = 20)
    private String assetClass;

    @Column(name = "side", nullable = false, length = 10)
    private String side; // BUY, SELL

    @Column(name = "order_type", length = 20)
    private String type; // MARKET, LIMIT

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // การใช้ BigDecimal สำคัญมาก (19,4 หมายถึง ตัวเลขรวม 19 หลัก ทศนิยม 4 ตำแหน่ง)
    @Column(name = "qty", precision = 19, scale = 4)
    private BigDecimal qty;

    @Column(name = "filled_qty", precision = 19, scale = 4)
    private BigDecimal filledQty;

    @Column(name = "filled_avg_price", precision = 19, scale = 4)
    private BigDecimal filledAvgPrice;

    @Column(name = "commission", precision = 19, scale = 4)
    private BigDecimal commission;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "filled_at")
    private Instant filledAt;
}
