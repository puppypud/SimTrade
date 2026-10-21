package com.alpaca.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
public class FinnhubFinancials {
    @JsonProperty("metric")
    private Metric metric;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Metric {
        @JsonProperty("marketCapitalization")
        private BigDecimal marketCap;

        @JsonProperty("beta")
        private BigDecimal beta;

        @JsonProperty("peBasicExclExtraIcons")
        private BigDecimal pe;

        @JsonProperty("52WeekHigh")
        private BigDecimal yearHigh; // ✅ สูตรคุณต้องการตัวนี้มาทำ Price Spread

        @JsonProperty("52WeekLow")
        private BigDecimal yearLow;  // ✅ สูตรคุณต้องการตัวนี้มาทำ Price Spread

        @JsonProperty("v")
        private BigDecimal volume;

        @JsonProperty("10DayAverageTradingVolume") // 🌟 ห้ามสะกดผิดแม้ตัวเดียว
        private BigDecimal avgVolume10Day;

    }
}
