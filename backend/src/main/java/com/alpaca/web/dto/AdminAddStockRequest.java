package com.alpaca.web.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminAddStockRequest {
    private String symbol;
    private String name;
    private String assetClass;   // US_EQUITY, CRYPTO
    private String category;     // STABLE, SWING, TRENDING, SPECULATIVE
    private String industry;
    private Double beta;
    private Long marketCap;
    private Long avgVolume;
    private Boolean isTradable;
}
