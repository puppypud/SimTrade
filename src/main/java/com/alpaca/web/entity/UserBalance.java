package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "UserBalance") // ชื่อตาราง
@Getter
@Setter
public class UserBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "balance_id")
    private Integer balanceId; // PK รันออโต้

    @Column(name = "user_id", nullable = false)
    private Integer userId; // FK เจ้าของกระเป๋า

    @Column(name = "available_balance", precision = 15, scale = 2, nullable = false)
    private BigDecimal availableBalance; // ยอดที่ดึงมาจาก Alpaca

    @Column(name = "updated_at", nullable = false, updatable = false)
    private LocalDateTime updatedAt; // เวลาที่ดึงข้อมูล

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now(); // บันทึกเวลาอัตโนมัติก่อน Save ลง DB
    }
}
