package com.alpaca.web;

import io.github.cdimascio.dotenv.Dotenv;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType;
import net.jacobpeterson.alpaca.model.util.apitype.MarketDataWebsocketSourceType;
import net.jacobpeterson.alpaca.model.util.apitype.TraderAPIEndpointType;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableRetry   // เปิดใช้งานการทำซ้ำ (Retry)
@EnableAsync   // เปิดใช้งานการรันเบื้องหลัง (Background Task)
@SpringBootApplication
@EnableCaching
public class Application {

    public static void main(String[] args) {
        // 🛠 ขั้นตอนที่ 1: โหลด .env เข้าสู่ System Properties ก่อนเริ่ม Spring
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(entry -> {
            System.setProperty(entry.getKey(), entry.getValue());
        });

        // 🚀 ขั้นตอนที่ 2: รัน Spring Application
        SpringApplication.run(Application.class, args);
    }

    // 🔑 1. Broker Key (ใช้ System.getProperty เพื่อดึงค่าที่โหลดมาจาก .env)
    @Bean(name = "brokerAPI")
    public AlpacaAPI brokerAPI() {
        return new AlpacaAPI(
                System.getProperty("BROKER_API_KEY"),
                System.getProperty("BROKER_API_SECRET"),
                BrokerAPIEndpointType.SANDBOX
        );
    }

    // 📈 2. Market Data Key
    @Bean(name = "marketDataAPI")
    public AlpacaAPI marketDataAPI() {
        return new AlpacaAPI(
                System.getProperty("TRADING_API_KEY"),
                System.getProperty("TRADING_API_SECRET"),
                TraderAPIEndpointType.PAPER,
                MarketDataWebsocketSourceType.IEX
        );
    }
}