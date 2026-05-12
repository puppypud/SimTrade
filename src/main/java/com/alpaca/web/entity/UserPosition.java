package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_position")
@Getter
@Setter
public class UserPosition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId; // เชื่อมกับ UserAccount

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol; // เช่น AAPL, BTC/USD

    @Column(name = "asset_class", length = 20)
    private String assetClass; // EQUITY / CRYPTO

    @Column(name = "quantity", nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity; // จำนวนที่ถือครอง (ละเอียดถึง 8 ตำแหน่งสำหรับคริปโต)

    @Column(name = "average_entry_price", nullable = false, precision = 18, scale = 4)
    private BigDecimal averageEntryPrice; // ราคาต้นทุนเฉลี่ย

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt; // วันที่เริ่มถือครอง

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt; // วันที่อัปเดตล่าสุด
}
