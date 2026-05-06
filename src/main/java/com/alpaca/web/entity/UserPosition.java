package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "User_Position") // ชื่อตาราง
@Getter
@Setter
public class UserPosition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId; // เก็บ ID ของผู้ใช้

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol; // ตัวย่อสินทรัพย์ เช่น AAPL, BTC/USD

    // [แก้ไขได้] หากระบบคุณรองรับหลายประเภทสินทรัพย์ (หุ้น, คริปโต) ควรเพิ่ม Column นี้
    @Column(name = "asset_class", length = 20)
    private String assetClass;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity; // จำนวนที่ถือครอง

    @Column(name = "average_entry_price", nullable = false, precision = 18, scale = 4)
    private BigDecimal averageEntryPrice; // ราคาต้นทุนเฉลี่ย

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt; // เวลาที่ซื้อหุ้นตัวนี้ครั้งแรก

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt; // เวลาที่มีการอัปเดต (ซื้อเพิ่ม/ขายออก) ล่าสุด
}
