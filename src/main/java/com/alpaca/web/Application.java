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

    // ---------------------------------------------------------
    // 🧪 ส่วนที่เพิ่มเข้ามาเพื่อ Test (จะทำงานทันทีเมื่อรันโปรแกรม)
    // ---------------------------------------------------------
    /*@Bean
    public CommandLineRunner testAlpacaConnection(@Qualifier("marketDataAPI") AlpacaAPI api) {
        return args -> {
            System.out.println("\n==================================================");
            System.out.println("🚀 กำลังเริ่มทดสอบการดึงข้อมูล Market Data (IEX)...");
            System.out.println("==================================================");

            try {
                // เช็คก่อนว่า Key โหลดมาจริงไหม (แบบเซ็นเซอร์)
                if (tradingApiKey == null || tradingApiSecret == null) {
                    throw new RuntimeException("❌ ไม่พบ Key ในไฟล์ .env กรุณาตรวจสอบ!");
                }
                System.out.println("🔑 Key Loaded: " + tradingApiKey.substring(0, 4) + "****************");

                // กำหนดเวลาย้อนหลัง 1 เดือน (เพื่อความชัวร์ว่ามีข้อมูล)
                OffsetDateTime end = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(15);
                OffsetDateTime start = end.minusMonths(1);

                System.out.println("📡 กำลังยิง API ไปที่ Alpaca (Stock: AAPL)...");

                // ยิง API แบบ Hardcode พารามิเตอร์ที่ถูกต้องที่สุด
                var response = api.marketData().stock().stockBars(
                        "AAPL",           // หุ้นใหญ่ มีข้อมูลแน่นอน
                        "1Day",           // กราฟรายวัน
                        start,
                        end,
                        10L,              // ขอแค่ 10 แท่ง
                        null,
                        null,
                        StockFeed.IEX,    // 👈 บังคับระบุ IEX (สำคัญมากสำหรับ Free Plan)
                        null,
                        null,
                        Sort.DESC
                );

                if (response.getBars() != null && response.getBars().containsKey("AAPL")) {
                    int count = response.getBars().get("AAPL").size();
                    System.out.println("\n✅ SUCCESS! เชื่อมต่อสำเร็จ");
                    System.out.println("✅ พบข้อมูลจำนวน: " + count + " แท่ง");
                    System.out.println("ตัวอย่างข้อมูลล่าสุด: " + response.getBars().get("AAPL").get(0));
                } else {
                    System.out.println("\n⚠️ เชื่อมต่อได้ แต่ไม่พบข้อมูล (Empty List)");
                }

            } catch (Exception e) {
                System.err.println("\n❌ FAILED! เกิดข้อผิดพลาด");
                System.err.println("สาเหตุ: " + e.getMessage());
                // ถ้าเป็น API Exception จะปริ้นรายละเอียดเพิ่ม
                if (e instanceof net.jacobpeterson.alpaca.openapi.marketdata.ApiException) {
                    var apiEx = (net.jacobpeterson.alpaca.openapi.marketdata.ApiException) e;
                    System.err.println("Response Body: " + apiEx.getResponseBody());
                }
                e.printStackTrace();
            }
            System.out.println("==================================================\n");
        };
    }*/
    // ---------------------------------------------------------

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