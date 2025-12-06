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
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
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

    // ดึง Key จาก .env ตรงๆ เพื่อความชัวร์ (ไม่ต้องผ่าน Bean Config ก็ได้ในท่านี้)
    @Value("***REDACTED_OLD_TRADING_KEY***")
    private String apiKey;

    @Value("***REDACTED_OLD_TRADING_SECRET***")
    private String apiSecret;

    public List<StockBar> getStockBars(String symbol,String viewType) {
        String cleanSymbol = symbol.trim();
        // --- 1. คำนวณ Start Date และ Timeframe ตาม viewType ---
        OffsetDateTime endTime = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startTime; // ประกาศไว้ก่อน
        String timeframe;
        int limit = 1000; // default
        log.info("Fetching StockBars (Manual REST) for: " + cleanSymbol);

        switch (viewType.toUpperCase()) {

            case "1D":
                timeframe = "2Min";
                startTime = endTime.minusDays(1);
                break;

            case "1W":
                // ดู 1 สัปดาห์
                timeframe = "1Hour"; // หรือ 1Hour
                startTime = endTime.minusWeeks(1);
                break;

            case "5D":
                timeframe = "15Min";
                startTime = endTime.minusDays(5);
                break;

            case "1M":
                timeframe = "1Day";
                startTime = endTime.minusMonths(1);
                break;

            case "6M":
                timeframe = "1Day";
                startTime = endTime.minusMonths(6);
                break;

            case "1Y":
                timeframe = "1Day";
                startTime = endTime.minusYears(1);
                break;

            case "5Y":
                timeframe = "1Day";
                startTime = endTime.minusYears(5);
                break;

            default: // ค่า Default
                timeframe = "2min";
                startTime = endTime.minusDays(1);
                break;
        }


        String rawDate = startTime.toString();

        log.info("Fetching Chart: {} | View: {} | Timeframe: {} | Start: {}", cleanSymbol, viewType, timeframe, rawDate);
        // 1. สร้าง URL แบบเดียวกับ cURL เป๊ะๆ
        // URL: https://data.alpaca.markets/v2/stocks/{symbol}/bars?timeframe=1Day&limit={limit}&feed=iex
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

                        // Mapping field เอง manual

                        // เวลา (Time) - อันเดิมถูกแล้วถ้า String เป็น format ISO-8601
                        bar.setT(OffsetDateTime.parse((String) barMap.get("t")));

                        // ราคา (Prices) - ต้องแปลงเป็น Double
                        bar.setO(Double.valueOf(barMap.get("o").toString())); // Open
                        bar.setH(Double.valueOf(barMap.get("h").toString())); // High
                        bar.setL(Double.valueOf(barMap.get("l").toString())); // Low
                        bar.setC(Double.valueOf(barMap.get("c").toString())); // Close

                        // ปริมาณ (Volume) - ต้องแปลงเป็น Long
                        // ใช้ Double.valueOf(...).longValue() เพื่อความชัวร์ในกรณีที่ JSON ส่งมาเป็นทศนิยม .0
                        // หรือถ้ามั่นใจว่าเป็นจำนวนเต็มใช้ Long.valueOf(...) ก็ได้ครับ
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
}