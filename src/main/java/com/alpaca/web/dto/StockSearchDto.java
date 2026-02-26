package com.alpaca.web.dto;
import lombok.*;


@Getter
@Setter
@Data
@NoArgsConstructor
public class StockSearchDto {
    private String symbol;
    private String name;
    private String exchange;

    public StockSearchDto(String symbol, String name, String exchange) {
        this.symbol = symbol;
        this.name = name;
        this.exchange = exchange;
    }
}
