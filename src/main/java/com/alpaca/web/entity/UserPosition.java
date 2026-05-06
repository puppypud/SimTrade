package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "User_Position") // ชื่อตาราง
@Getter
@Setter
public class UserPosition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(length = 10, nullable = false)
    private String symbol;

    // ใช้ precision = 18, scale = 8 เพื่อรองรับทศนิยมของ Crypto เช่น 0.00000001 BTC
    @Column(precision = 18, scale = 8, nullable = false)
    private BigDecimal quantity;

    @Column(name = "average_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal averagePrice;

    @Column(name = "cost_basis", precision = 15, scale = 2, nullable = false)
    private BigDecimal costBasis;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ทำงานตอน Insert ข้อมูลครั้งแรก
    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ทำงานตอน Update ข้อมูล (เช่น ซื้อเพิ่ม หรือขายบางส่วน)
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
