package com.alpaca.web;

import io.github.cdimascio.dotenv.Dotenv;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType;
import net.jacobpeterson.alpaca.model.util.apitype.MarketDataWebsocketSourceType;
import net.jacobpeterson.alpaca.model.util.apitype.TraderAPIEndpointType;
import net.jacobpeterson.alpaca.openapi.marketdata.model.Sort;
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockFeed;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@SpringBootApplication
public class Application {

    // โหลด .env
    Dotenv dotenv = Dotenv.load();
    String brokerApiKey = dotenv.get("BROKER_API_KEY").trim();
    String brokerApiSecret = dotenv.get("BROKER_API_SECRET").trim();
    String tradingApiKey = dotenv.get("TRADING_API_KEY").trim();
    String tradingApiSecret = dotenv.get("TRADING_API_SECRET").trim();

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }


    // 🔑 1. Broker Key
    @Bean(name = "brokerAPI")
    public AlpacaAPI brokerAPI() {
        return new AlpacaAPI(brokerApiKey, brokerApiSecret, BrokerAPIEndpointType.SANDBOX);
    }

    // 📈 2. Market Data Key
    @Bean(name = "marketDataAPI")
    public AlpacaAPI marketDataAPI() {
        // ใช้ Paper Key (PK...) คู่กับ TraderAPIEndpointType.PAPER
        return new AlpacaAPI(tradingApiKey, tradingApiSecret, TraderAPIEndpointType.PAPER, MarketDataWebsocketSourceType.IEX);
    }
}