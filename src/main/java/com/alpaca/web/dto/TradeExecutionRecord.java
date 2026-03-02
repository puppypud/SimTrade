package com.alpaca.web.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Duration;

@Data
public class TradeExecutionRecord {
    private String symbol;
    private String category; // STABLE, SWING, TRENDING, SPECULATIVE
    private Duration holdingPeriod; // ระยะเวลาที่ถือครอง (หักลบระหว่างเวลาซื้อ-เวลาขาย)
    private boolean isOvernight; // ถือข้ามคืนหรือไม่
    private BigDecimal realizedProfitPercentage; // กำไร/ขาดทุนของไม้นี้เป็น %

    // ข้อมูลจาก Order ขา Buy เพื่อใช้คำนวณ FOMO
    private BigDecimal rsiAtBuy;
    private BigDecimal priceChangeBeforeBuy;

    // ข้อมูลจาก Order ขา Sell เพื่อใช้คำนวณ Panic Sell
    private BigDecimal rsiAtSell;
    private BigDecimal priceChangeBeforeSell;
}
