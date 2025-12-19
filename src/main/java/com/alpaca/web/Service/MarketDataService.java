package com.alpaca.web.Service;

import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.MarketDataWebsocketSourceType;
import net.jacobpeterson.alpaca.model.util.apitype.TraderAPIEndpointType;
import net.jacobpeterson.alpaca.openapi.marketdata.model.CryptoLatestLoc;
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import net.jacobpeterson.alpaca.AlpacaAPI; // Import เพิ่ม
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType; // Import เพิ่ม
import jakarta.annotation.PostConstruct; // Import เพิ่ม
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.time.*;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class MarketDataService {
    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private AlpacaAPI alpacaAPI;

    @Value("***REDACTED_OLD_TRADING_KEY***")
    private String apiKey;

    @Value("***REDACTED_OLD_TRADING_SECRET***")
    private String apiSecret;

    // พิ่ม Timezone ของ New York (เพื่อรองรับ 21:30 / 20:30 อัตโนมัติ)
    private final ZoneId NY_ZONE = ZoneId.of("America/New_York");

    @PostConstruct
    public void init() {
        if (apiKey != null && apiSecret != null) {
            // ❌ แบบเดิม (ผิด): new AlpacaAPI(apiKey, apiSecret);

            // ✅ แบบใหม่ (ถูก): ต้องใส่ PAPER และ IEX เพิ่ม
            this.alpacaAPI = new AlpacaAPI(
                    apiKey,
                    apiSecret,
                    TraderAPIEndpointType.PAPER, // ระบุว่าเป็น Paper Trading (เพราะ Key ขึ้นต้นด้วย PK)
                    MarketDataWebsocketSourceType.IEX // ระบุแหล่งข้อมูล (IEX คือฟรี/Standard)
            );

            log.info("AlpacaAPI initialized successfully.");
        } else {
            log.error("Alpaca API Key/Secret is null via @Value");
        }
    }

    public List<StockBar> getStockBars(String symbol, String viewType) {
        String cleanSymbol = symbol.trim();
        ZonedDateTime startTime;
        String timeframe;
        int limit = 1000; // default
        // ดึงเวลาปัจจุบันในนิวยอร์ก
        ZonedDateTime nowNY = ZonedDateTime.now(NY_ZONE);
        ZonedDateTime targetOpen = nowNY.toLocalDate().atTime(9, 30).atZone(NY_ZONE);
        switch (viewType.toUpperCase()) {

            case "1D":
                timeframe = "1Min";
                // ถอยไปเริ่มที่ "เมื่อวาน" เวลา 09:30 แทน
                startTime = targetOpen.minusDays(1);
                break;

            case "1W":
                // ดู 1 สัปดาห์
                timeframe = "1Hour"; // หรือ 1Hour
                startTime = targetOpen.minusWeeks(1);
                break;

            case "5D":
                timeframe = "15Min";
                startTime = targetOpen.minusDays(5);
                break;

            case "1M":
                timeframe = "1Day";
                startTime = targetOpen.minusMonths(1);
                break;

            case "6M":
                timeframe = "1Day";
                startTime = targetOpen.minusMonths(6);
                break;

            case "1Y":
                timeframe = "1Day";
                startTime = targetOpen.minusYears(1);
                break;

            case "5Y":
                timeframe = "1Month";
                startTime = targetOpen.minusYears(5);
                break;

            default: // ค่า Default
                timeframe = "2Min";
                startTime = targetOpen.minusDays(2);
                break;
        }
        OffsetDateTime startZDT = startTime.toOffsetDateTime();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
        String rawDate = startZDT.withOffsetSameInstant(ZoneOffset.UTC).format(formatter);
        //log.info("Fetching Chart: {} | View: {} | Timeframe: {} | Start: {}", cleanSymbol, viewType, timeframe, rawDate);
        // 1. สร้าง URL แบบเดียวกับ cURL เป๊ะๆ
        String urlString = String.format(
                "https://data.alpaca.markets/v2/stocks/%s/bars?timeframe=%s&feed=iex&start=%s&limit=%d",
                cleanSymbol, timeframe, rawDate, limit
        );
        // แปลงเป็น URI Object เพื่อบังคับใช้ URL นี้เป๊ะๆ
        URI uri = URI.create(urlString);
        // 2. สร้าง Header (ใส่ Key)
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            // 3. ยิง Request
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);

            // 4. แปลงผลลัพธ์ JSON กลับเป็น List<StockBar>
            if (response.getBody() != null && response.getBody().containsKey("bars")) {
                List<Map<String, Object>> barsData = (List<Map<String, Object>>) response.getBody().get("bars");

                List<StockBar> stockBars = new ArrayList<>();
                if (barsData != null) {
                    for (Map<String, Object> barMap : barsData) {
                        StockBar bar = new StockBar();
                        String tStr = (String) barMap.get("t");
                        OffsetDateTime odt = OffsetDateTime.parse(tStr);
                        // Mapping field เอง manual
                        bar.setT(odt.withOffsetSameInstant(ZoneOffset.of("+07:00")));
                        bar.setO(Double.valueOf(barMap.get("o").toString())); // Open
                        bar.setH(Double.valueOf(barMap.get("h").toString())); // High
                        bar.setL(Double.valueOf(barMap.get("l").toString())); // Low
                        bar.setC(Double.valueOf(barMap.get("c").toString())); // Close
                        String volStr = barMap.get("v").toString();
                        bar.setV(Double.valueOf(volStr).longValue());
                        stockBars.add(bar);

                    }
                }
                return stockBars;
            }

        } catch (Exception e) {
            log.error("❌ Error fetching data manually: " + e.getMessage());
            // ปริ้น response body ถ้า error เป็น HTTP Error
            if (e instanceof HttpClientErrorException) {
                log.error("Response Body: " + ((HttpClientErrorException) e).getResponseBodyAsString());
            }
        }

        return Collections.emptyList();
    }

    public Map<String, Object> getLatestQuote(String symbol) {
        String cleanSymbol = symbol.trim().toUpperCase();
        // ใช้ Endpoint snapshot (บังคับ feed=iex)
        String urlString = String.format(
                "https://data.alpaca.markets/v2/stocks/%s/snapshot?feed=iex",
                cleanSymbol
        );

        URI uri = URI.create(urlString);
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
            // Alpaca Snapshot response structure: { "symbol": "AAPL", "latestTrade": {...}, "latestQuote": {...}, ... }
            if (response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                Map<String, Object> result = new java.util.HashMap<>();
                result.put("symbol", body.get("symbol"));

                // 1. ดึงข้อมูล Last Trade (สำหรับโชว์ราคาตัวใหญ่ให้ตรงกราฟ)
                if (body.containsKey("latestTrade")) {
                    Map<String, Object> trade = (Map<String, Object>) body.get("latestTrade");
                    result.put("price", trade.get("p"));      // Price
                    result.put("tradeTime", trade.get("t"));  // Time
                }

                // 2. ดึงข้อมูล Latest Quote (สำหรับโชว์ Bid/Ask)
                if (body.containsKey("latestQuote")) {
                    Map<String, Object> quote = (Map<String, Object>) body.get("latestQuote");
                    result.put("askPrice", quote.get("ap"));
                    result.put("askSize", quote.get("as"));
                    result.put("bidPrice", quote.get("bp"));
                    result.put("bidSize", quote.get("bs"));
                }

                // 3. (แถม) ข้อมูล % Change ของวัน (dailyBar) ถ้ามี
                if (body.containsKey("dailyBar")) {
                    Map<String, Object> daily = (Map<String, Object>) body.get("dailyBar");
                    result.put("openPrice", daily.get("o"));
                    // เอาไว้คำนวณ % change ที่ Frontend: (price - openPrice) / openPrice * 100
                }

                return result;
            }
        } catch (Exception e) {
            log.error("❌ Error fetching snapshot for {}: {}", cleanSymbol, e.getMessage());
        }
        return Collections.emptyMap();
    }

    public List<StockBar> getCryptoBars(String symbol, String viewType) {
        String cleanSymbol = symbol.trim().toUpperCase();

        // ถ้า User ลืมพิมพ์ /USD เราเติมให้ที่นี่ได้เลย เพราะรู้อยู่แล้วว่าเป็นฟังก์ชัน Crypto
        if (!cleanSymbol.contains("/")) {
            cleanSymbol = cleanSymbol + "/USD";
        }

        // กำหนด Timeframe
        String timeframe;
        int limit = 1000;
        // ... (logic คำนวณ startTime เหมือนเดิม หรือปรับให้เหมาะกับ Crypto) ...
        // ตัวอย่าง: ถ้า viewType เป็น 1D อาจใช้ timeframe = "1Min"
        timeframe = "1Min"; // ตัวอย่างย่อ

        // *** ใช้ URL ของ Crypto โดยเฉพาะ ***
        String urlString = String.format(
                "https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=%s&timeframe=%s&limit=%d",
                cleanSymbol, timeframe, limit
        );

        URI uri = URI.create(urlString);
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);

            // Logic แกะ JSON ของ Crypto Bars (โครงสร้างต่างจาก Stock นิดหน่อย)
            if (response.getBody() != null && response.getBody().containsKey("bars")) {
                Map<String, Object> allBars = (Map<String, Object>) response.getBody().get("bars");
                if (allBars.containsKey(cleanSymbol)) {
                    List<Map<String, Object>> barList = (List<Map<String, Object>>) allBars.get(cleanSymbol);

                    List<StockBar> cryptoBars = new ArrayList<>();
                    for (Map<String, Object> barMap : barList) {
                        StockBar bar = new StockBar();
                        // Map ค่าเข้า Object (Crypto มักใช้ field 't', 'o', 'h', 'l', 'c', 'v' เหมือนกัน)
                        bar.setT(OffsetDateTime.parse(barMap.get("t").toString()));
                        bar.setO(Double.valueOf(barMap.get("o").toString()));
                        bar.setH(Double.valueOf(barMap.get("h").toString()));
                        bar.setL(Double.valueOf(barMap.get("l").toString()));
                        bar.setC(Double.valueOf(barMap.get("c").toString()));
                        bar.setV(Double.valueOf(barMap.get("v").toString()).longValue());
                        cryptoBars.add(bar);
                    }
                    return cryptoBars;
                }
            }
        } catch (Exception e) {
            log.error("❌ Error fetching crypto bars: " + e.getMessage());
        }
        return Collections.emptyList();
    }
    public Map<String, Object> getLatestCryptoQuote(String symbol) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("symbol", symbol);

            // ใช้ CryptoLatestLoc.US สำหรับดึงข้อมูลฝั่ง US
            CryptoLatestLoc loc = CryptoLatestLoc.US;

            // 1. ดึงราคาซื้อขายล่าสุด (Trade) -> ใช้ cryptoLatestTrades
            try {
                // เรียก cryptoLatestTrades แทน getLatestTrade
                var tradeResp = alpacaAPI.marketData().crypto().cryptoLatestTrades(loc, symbol);

                // แกะข้อมูลจาก Response (โครงสร้างจะเป็น Map<String, CryptoTrade>)
                if (tradeResp != null && tradeResp.getTrades() != null && tradeResp.getTrades().containsKey(symbol)) {
                    var trade = tradeResp.getTrades().get(symbol);
                    data.put("price", trade.getP()); // getP() คือ Price
                } else {
                    data.put("price", 0.0);
                }
            } catch (Exception e) {
                log.error("Error fetching crypto trade: " + e.getMessage());
                data.put("price", 0.0);
            }

            // 2. ดึงราคาเสนอซื้อ/ขาย (Quote) -> ใช้ cryptoLatestQuotes
            try {
                // เรียก cryptoLatestQuotes แทน getLatestQuote
                var quoteResp = alpacaAPI.marketData().crypto().cryptoLatestQuotes(loc, symbol);

                // แกะข้อมูลจาก Response
                if (quoteResp != null && quoteResp.getQuotes() != null && quoteResp.getQuotes().containsKey(symbol)) {
                    var quote = quoteResp.getQuotes().get(symbol);
                    data.put("askPrice", quote.getAp()); // Ask Price
                    data.put("askSize", quote.getAs());  // Ask Size
                    data.put("bidPrice", quote.getBp()); // Bid Price
                    data.put("bidSize", quote.getBs());  // Bid Size
                }
            } catch (Exception e) {
                // ถ้าหา Quote ไม่เจอ ให้ใส่ 0 ไว้
                data.put("askPrice", 0.0);
                data.put("bidPrice", 0.0);
            }

            return data;

        } catch (Exception e) {
            log.error("Error getting crypto quote for " + symbol, e);
            return Map.of();
        }
    }
}