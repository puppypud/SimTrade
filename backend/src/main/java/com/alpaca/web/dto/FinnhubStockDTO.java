package com.alpaca.web.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FinnhubStockDTO {
    @JsonProperty("c")
    private BigDecimal currentPrice;

    @JsonProperty("v") // บางครั้ง Metric ก็มี Volume
    private BigDecimal volume;

    @JsonProperty("h")
    private BigDecimal dayHigh; // ⚠️ Finnhub 'h' คือ High ของวันนี้เท่านั้น

    @JsonProperty("l")
    private BigDecimal dayLow;  // ⚠️ Finnhub 'l' คือ Low ของวันนี้เท่านั้น
}

