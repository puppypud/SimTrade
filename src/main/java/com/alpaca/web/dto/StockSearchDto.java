package com.alpaca.web.dto;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;


@Getter
@Setter
@Data
@NoArgsConstructor
public class StockSearchDto {
    private String symbol;
    private String name;
    private String exchange;

    // --- Filter Fields (ส่งจากหน้าบ้าน) ---
    private List<String> sectors;           // กรองตาม industry/sector เช่น ["Technology", "Healthcare"]
    private List<String> marketCapTiers;    // กรองตาม Market Cap เช่น ["MEGA", "LARGE", "MID"]
    private BigDecimal priceMin;            // ราคาต่ำสุด
    private BigDecimal priceMax;            // ราคาสูงสุด
    private List<String> assetTypes;        // ประเภททรัพย์สิน เช่น ["US_EQUITY", "CRYPTO"]
    private List<String> categories;        // หมวดหมู่เทรด เช่น ["STABLE", "SWING", "TRENDING"]
    private String keyword;                 // คำค้นหา (symbol/name)

    public StockSearchDto(String symbol, String name, String exchange) {
        this.symbol = symbol;
        this.name = name;
        this.exchange = exchange;
    }
}
