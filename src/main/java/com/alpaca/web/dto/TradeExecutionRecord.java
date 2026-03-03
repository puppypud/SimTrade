package com.alpaca.web.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

@Data
public class TradeExecutionRecord {
    private String symbol;
    private String category; // STABLE, SWING, TRENDING, SPECULATIVE

    // --- 1. เพิ่ม Field สำหรับจัดเก็บเวลา (แก้ไขจุดที่ Error) ---
    private LocalDateTime entryTime; // เวลาที่ซื้อ (จาก matchedBuy.getFilledAt())
    private LocalDateTime exitTime;  // เวลาที่ขาย

    // --- 2. เพิ่ม Field สำหรับการคำนวณเงิน (แก้ไขจุดที่ Error) ---
    private BigDecimal positionSize;        // ทุน (ราคาซื้อ x จำนวน)
    private BigDecimal realizedProfitAmount; // กำไร/ขาดทุน (ตัวเงิน $)
    private BigDecimal realizedProfitPercentage; // กำไร/ขาดทุน (%)

    // --- 3. ข้อมูลการถือครอง ---
    private Duration holdingPeriod;
    private boolean isOvernight;

    // ข้อมูลจาก Order ขา Buy เพื่อใช้คำนวณ FOMO
    private BigDecimal rsiAtBuy;
    private BigDecimal priceChangeBeforeBuy;

    // ข้อมูลจาก Order ขา Sell เพื่อใช้คำนวณ Panic Sell
    private BigDecimal rsiAtSell;
    private BigDecimal priceChangeBeforeSell;
}
