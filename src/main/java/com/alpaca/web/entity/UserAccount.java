package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@Table(name = "user_account")
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", columnDefinition = "INTEGER")
    private Long id;

    // ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (จำกัด 100 ตัวอักษร)
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    // รหัสผ่าน (เก็บ Hash จึงต้องเผื่อความยาว 255)
    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @Column(name = "account_number", length = 20)
    private String accountNumber;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "status", length = 20)
    private String status; // ACTIVE / INACTIVE

    @Column(name = "role", length = 20)
    private String role = "USER"; // USER / ADMIN

    // UUID จาก Alpaca มีความยาว 36 ตัวอักษร
    @Column(name = "alpaca_account_id", unique = true, length = 36)
    private String alpacaAccountId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "trader_type", length = 50)
    private String traderType; // Day Trader / Swing Trader / etc.

    @Column(name = "risk_behavior", length = 100)
    private String riskBehavior;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_watchlist", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "symbol", length = 20) // สัญลักษณ์หุ้นมักไม่เกิน 20
    private Set<String> watchlist = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
