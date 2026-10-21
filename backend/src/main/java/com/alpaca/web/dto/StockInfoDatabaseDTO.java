package com.alpaca.web.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StockInfoDatabaseDTO {
    private String symbol;
    private String name;
    private BigDecimal beta;
    private Long marketCap;
    private Long volume;
    private String category;
    private String industry;
}
