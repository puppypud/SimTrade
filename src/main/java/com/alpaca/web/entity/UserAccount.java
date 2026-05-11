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

    // ชื่อผู้ใช้สำหรับเข้าสู่ระบบ
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "role", length = 20)
    private String role = "USER";

    @Column(name = "alpaca_account_id", unique = true)
    private String alpacaAccountId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "trader_type", length = 50)
    private String traderType;


    @Column(name = "risk_behavior")
    private String riskBehavior;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_watchlist", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "symbol")
    private Set<String> watchlist = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
