package com.alpaca.web.corsconfig;

import com.alpaca.web.enums.TraderType;

public class RiskConfig {
    // 1. FOMO Config
    public int fomoTimeWindowSeconds;
    public int fomoMaxOrders;
    public double fomoPriceSurgePercent;

    // 2. Selling Too Early Config
    public double takeProfitExpectedPercent;
    public double sellingTooEarlyTriggerPercent;

    // 3. Panic Sell Config
    public double panicSellPriceDropPercent;
    public double panicSellVolumePercent;

    // 4. Holding Losers Too Long Config
    public double holdingLoserLossPercent;
    public int holdingLoserMaxDays;

    public static RiskConfig getConfig(TraderType type) {
        RiskConfig config = new RiskConfig();

        switch (type) {
            case SCALPER:
                config.fomoTimeWindowSeconds = 60;
                config.fomoMaxOrders = 10;
                config.fomoPriceSurgePercent = 0.5;
                config.takeProfitExpectedPercent = 1.0;
                config.sellingTooEarlyTriggerPercent = 0.2;
                config.panicSellPriceDropPercent = -0.5;
                config.panicSellVolumePercent = 100.0;
                config.holdingLoserLossPercent = -1.0;
                config.holdingLoserMaxDays = 0;
                break;

            case DAY_TRADER:
                config.fomoTimeWindowSeconds = 60;
                config.fomoMaxOrders = 5;
                config.fomoPriceSurgePercent = 1.0;
                config.takeProfitExpectedPercent = 3.0;
                config.sellingTooEarlyTriggerPercent = 1.0;
                config.panicSellPriceDropPercent = -1.5;
                config.panicSellVolumePercent = 100.0;
                config.holdingLoserLossPercent = -2.0;
                config.holdingLoserMaxDays = 1;
                break;

            case SWING_TRADER:
                config.fomoTimeWindowSeconds = 60;
                config.fomoMaxOrders = 3;
                config.fomoPriceSurgePercent = 1.5;
                config.takeProfitExpectedPercent = 10.0;
                config.sellingTooEarlyTriggerPercent = 3.0;
                config.panicSellPriceDropPercent = -3.0;
                config.panicSellVolumePercent = 100.0;
                config.holdingLoserLossPercent = -5.0;
                config.holdingLoserMaxDays = 5;
                break;

            case INVESTOR:
                config.fomoTimeWindowSeconds = 3600;
                config.fomoMaxOrders = 2;
                config.fomoPriceSurgePercent = 3.0;
                config.takeProfitExpectedPercent = 50.0;
                config.sellingTooEarlyTriggerPercent = 10.0;
                config.panicSellPriceDropPercent = -5.0;
                config.panicSellVolumePercent = 100.0;
                config.holdingLoserLossPercent = -15.0;
                config.holdingLoserMaxDays = 30;
                break;
        }
        return config;
    }
}
