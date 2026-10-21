package com.alpaca.web.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockSearchResultDTO {
    private String symbol;
    private String name;
    private String exchange;
    private String assetClass;
    private String status;

    // ข้อมูลจาก Database (ถ้ามี)
    private String category;
    private String industry;
    private Long marketcap;
    private BigDecimal bata;
    private Long volume;

    // --- Filter Result Fields (ข้อมูลเพิ่มเติมสำหรับหน้าผลลัพธ์) ---
    private BigDecimal currentPrice;        // ราคาปัจจุบัน
    private BigDecimal oneYearReturnPct;    // ผลตอบแทน 1 ปี (%)
    private String marketCapTier;           // ระดับ Market Cap เช่น MEGA, LARGE, MID
}
