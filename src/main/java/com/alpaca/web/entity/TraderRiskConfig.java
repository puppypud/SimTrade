package com.alpaca.web.entity;

import com.alpaca.web.enums.TraderType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "trader_risk_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TraderRiskConfig {

    @Id
    @Enumerated(EnumType.STRING)
    private TraderType traderType;

    // 1. FOMO Config
    private int fomoTimeWindowSeconds;
    private int fomoMaxOrders;
    private double fomoPriceSurgePercent;

    // 2. Selling Too Early Config
    private double takeProfitExpectedPercent;
    private double sellingTooEarlyTriggerPercent;

    // 3. Panic Sell Config
    private double panicSellPriceDropPercent;
    private double panicSellVolumePercent;

    // 4. Holding Losers Too Long Config
    private double holdingLoserLossPercent;
    private int holdingLoserMaxDays;
}
