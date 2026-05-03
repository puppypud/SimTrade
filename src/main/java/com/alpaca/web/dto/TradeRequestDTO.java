package com.alpaca.web.dto;

import com.alpaca.web.enums.TraderType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TradeRequestDTO {
    private Long userId;
    private String symbol;
    private String side; // "BUY" หรือ "SELL"

    // ข้อมูลประกอบการวิเคราะห์พฤติกรรม (คำนวณส่งมาจากหน้าบ้าน หรือให้ Backend คำนวณก็ได้)
    private double currentProfitPercent;
    private double priceChangePercent;
    private double volumeSoldPercent;

    // ประเภทของนักลงทุน (ถ้าหน้าบ้านไม่ได้ส่งมา เราสามารถไปคิวรี่จาก DB ใน Service ได้)
    private TraderType traderType;
}
