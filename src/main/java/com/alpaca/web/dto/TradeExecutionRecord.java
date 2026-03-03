package com.alpaca.web.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

@Data
public class TradeExecutionRecord {
    private String symbol;
    private String category; // STABLE, SWING, TRENDING, SPECULATIVE

    // --- 1. เพิ่ม Field สำหรับจัดเก็บเวลา
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;

    // --- 2. เพิ่ม Field สำหรับการคำนวณเงิน
    private BigDecimal positionSize;        // ทุน (ราคาซื้อ x จำนวน)
    private BigDecimal realizedProfitAmount; // กำไร/ขาดทุน (ตัวเงิน $)
    private BigDecimal realizedProfitPercentage; // กำไร/ขาดทุน (%)

    // --- 3. ข้อมูลการถือครอง ---
    private Duration holdingPeriod;
    private boolean isOvernight;

    private BigDecimal rsiAtEntry; // เปลี่ยนชื่อเป็น Entry ให้เป็นกลาง (รองรับทั้ง Buy/Sell)
    private BigDecimal priceChangeBeforeEntry;
}
