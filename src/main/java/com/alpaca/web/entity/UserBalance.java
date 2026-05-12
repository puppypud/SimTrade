package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_balance")
@Getter
@Setter
public class UserBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "balance_id")
    private Integer balanceId; // PK รันออโต้

    @Column(name = "user_id", nullable = false)
    private Integer userId; // FK เจ้าของกระเป๋า

    // ยอดที่ดึงมาจาก Alpaca (ทศนิยม 2 ตำแหน่ง)
    @Column(name = "available_balance", precision = 15, scale = 2, nullable = false)
    private BigDecimal availableBalance;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt; // เวลาที่ดึงข้อมูลล่าสุด

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(); // อัปเดตเวลาอัตโนมัติทุกครั้งที่ Save/Update
    }
}
