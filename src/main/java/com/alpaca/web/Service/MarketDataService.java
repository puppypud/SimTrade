package com.alpaca.web.Service;

import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
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

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.time.*;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class MarketDataService {
    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);
    private final RestTemplate restTemplate = new RestTemplate();


    @Value("***REDACTED_OLD_TRADING_KEY***")
    private String apiKey;

    @Value("***REDACTED_OLD_TRADING_SECRET***")
    private String apiSecret;

    // พิ่ม Timezone ของ New York (เพื่อรองรับ 21:30 / 20:30 อัตโนมัติ)
    private final ZoneId NY_ZONE = ZoneId.of("America/New_York");

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

}