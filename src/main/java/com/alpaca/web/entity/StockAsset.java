package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Getter
@Setter
@Table(name = "stock_asset")
public class StockAsset {

    @Id
    @Column(name = "symbol", length = 20, nullable = false)
    private String symbol; // รหัสหุ้น เช่น AAPL, TSLA, BTC/USD

    @Column(name = "name", length = 100, nullable = false)
    private String name; // ชื่อบริษัท/เหรียญ

    @Column(name = "asset_class", length = 20)
    private String assetClass; // US_EQUITY หรือ CRYPTO

    // --- ข้อมูล Fundamental สำหรับอ้างอิง ---
    @Column(name = "beta", precision = 10, scale = 4)
    private BigDecimal beta; // ค่าความผันผวน

    @Column(name = "market_cap")
    private Long marketCap; // มูลค่าตลาดรวม (หน่วยเป็นดอลลาร์)

    @Column(name = "avg_volume")
    private Long avgVolume; // ปริมาณซื้อขายเฉลี่ย

    // --- ข้อมูลที่เรา "จัดหมวดหมู่" ไว้ล่วงหน้า (ใช้ในการวิเคราะห์พฤติกรรม) ---
    @Column(name = "category", length = 50)
    private String category; // STABLE, SWING, TRENDING, SPECULATIVE

    // --- ระบบเปิดปิดของ Admin ---
    @Column(name = "is_tradable", nullable = false)
    private boolean isTradable = true; // เอาไว้ให้ Admin บล็อกหุ้นตัวนี้ไม่ให้คนซื้อได้

    @Column(name = "industry", length = 50)
    private String industry;
}
