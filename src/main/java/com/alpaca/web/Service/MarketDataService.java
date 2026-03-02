package com.alpaca.web.Service;

import com.alpaca.web.dto.StockSearchDto;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.MarketDataWebsocketSourceType;
import net.jacobpeterson.alpaca.model.util.apitype.TraderAPIEndpointType;
import net.jacobpeterson.alpaca.openapi.broker.model.Clock;
import net.jacobpeterson.alpaca.openapi.brokerapi.model.Asset;
import net.jacobpeterson.alpaca.openapi.marketdata.model.CryptoLatestLoc;
import net.jacobpeterson.alpaca.openapi.trader.model.Assets;
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import net.jacobpeterson.alpaca.AlpacaAPI; // Import เพิ่ม
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType; // Import เพิ่ม
import jakarta.annotation.PostConstruct; // Import เพิ่ม
import net.jacobpeterson.alpaca.openapi.tradingapi.model.AssetClass;
import org.slf4j.Logger;
import org.springframework.cache.annotation.Cacheable;
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
import java.util.stream.Collectors;

import net.jacobpeterson.alpaca.openapi.trader.ApiException;

@Service
public class MarketDataService {
    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private BrokerService brokerService;
    private AlpacaAPI alpacaAPI;
    private boolean isMaintenanceActive = false; // ตั้งค่าเริ่มต้นเป็น false
    private String mintenanceMessage = "";
    @Value("***REDACTED_TRADING_KEY***")
    private String apiKey;

    @Value("***REDACTED_TRADING_SECRET***")
    private String apiSecret;

    // พิม Timezone ของ New York (เพื่อรองรับ 21:30 / 20:30 อัตโนมัติ)
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

    public MarketDataService(BrokerService brokerService /* ถ้ามี Service อื่นๆ รับมาด้วยก็ใส่ต่อท้ายได้เลย */) {
        this.brokerService = brokerService;
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
                // แก้ให้เริ่มที่เวลาเปิดตลาดของ "วันนี้" (หรือวันล่าสุดที่เปิด)
                startTime = targetOpen;
                // หากปัจจุบันยังไม่ถึงเวลาเปิดวันนี้ ให้ถอยไป 1 วันเพื่อให้มีข้อมูลโชว์
                if (nowNY.isBefore(targetOpen)) {
                    startTime = targetOpen.minusDays(1);
                }
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
        // log.info("Fetching Chart: {} | View: {} | Timeframe: {} | Start: {}",
        // cleanSymbol, viewType, timeframe, rawDate);
        // 1. สร้าง URL แบบเดียวกับ cURL เป๊ะๆ
        String urlString = String.format(
                "https://data.alpaca.markets/v2/stocks/%s/bars?timeframe=%s&feed=iex&start=%s&limit=%d",
                cleanSymbol, timeframe, rawDate, limit);
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
        // ✅ เพิ่มการเช็ค: ถ้ามี "/" แสดงว่าเป็น Crypto ให้ส่งไปฟังก์ชัน Crypto แทนทันที
        if (symbol.contains("/")) {
            return getLatestCryptoQuote(symbol);
        }

        // --- ส่วนเดิม (สำหรับหุ้น) ---
        String cleanSymbol = symbol.trim().toUpperCase();
        String urlString = String.format(
                "https://data.alpaca.markets/v2/stocks/%s/snapshot?feed=iex",
                cleanSymbol);

        URI uri = URI.create(urlString);
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
            if (response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                Map<String, Object> result = new java.util.HashMap<>();
                result.put("symbol", body.get("symbol"));

                if (body.containsKey("latestTrade")) {
                    Map<String, Object> trade = (Map<String, Object>) body.get("latestTrade");
                    result.put("price", trade.get("p"));
                    result.put("tradeTime", trade.get("t"));
                }
                if (body.containsKey("latestQuote")) {
                    Map<String, Object> quote = (Map<String, Object>) body.get("latestQuote");
                    result.put("askPrice", quote.get("ap"));
                    result.put("askSize", quote.get("as"));
                    result.put("bidPrice", quote.get("bp"));
                    result.put("bidSize", quote.get("bs"));
                }
                if (body.containsKey("dailyBar")) {
                    Map<String, Object> daily = (Map<String, Object>) body.get("dailyBar");
                    result.put("openPrice", daily.get("o"));
                }
                if (body.containsKey("prevDailyBar")) {
                    Map<String, Object> prevDaily = (Map<String, Object>) body.get("prevDailyBar");
                    result.put("prevClose", prevDaily.get("c"));
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

        // ถ้า User ลืมพิมพ์ /USD เราเติมให้ที่นี่ได้เลย
        if (!cleanSymbol.contains("/")) {
            cleanSymbol = cleanSymbol + "/USD";
        }

        // 1. กำหนด Timeframe และ StartTime ตาม viewType
        String timeframe;
        int limit = 10000; // เพิ่ม Limit ให้เยอะขึ้นเพื่อรองรับข้อมูลจำนวนมาก (Alpaca รองรับสูงสุด 10,000)

        ZonedDateTime nowUTC = ZonedDateTime.now(ZoneOffset.UTC); // Crypto ใช้เวลา UTC
        ZonedDateTime startTime;

        switch (viewType.toUpperCase()) {
            case "1D":
                timeframe = "2Min"; // 1 วัน ใช้แท่งละ 5 นาที (1440/5 = 288 แท่ง) กราฟจะสวยพอดี
                startTime = nowUTC.minusDays(1);
                break;
            case "1W":
                timeframe = "30Min"; // 1 อาทิตย์ ใช้แท่งละ 30 นาที
                startTime = nowUTC.minusWeeks(1);
                break;
            case "1M":
                timeframe = "2Hour"; // 1 เดือน ใช้แท่งละ 2 ชม (หรือ 4Hour ก็ได้)
                startTime = nowUTC.minusMonths(1);
                break;
            case "1Y":
                timeframe = "1Day"; // 1 ปี ใช้แท่งละ 1 วัน
                startTime = nowUTC.minusYears(1);
                break;
            default:
                timeframe = "15Min";
                startTime = nowUTC.minusDays(1);
                break;
        }

        // 2. แปลง startTime เป็น String format ที่ API ต้องการ (RFC3339)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
        String startStr = startTime.format(formatter);

        // 3. สร้าง URL โดยใส่ parameter &start=... เข้าไปด้วย
        String urlString = String.format(
                "https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=%s&timeframe=%s&limit=%d&start=%s",
                cleanSymbol, timeframe, limit, startStr);

        URI uri = URI.create(urlString);
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);

            if (response.getBody() != null && response.getBody().containsKey("bars")) {
                Map<String, Object> allBars = (Map<String, Object>) response.getBody().get("bars");
                if (allBars.containsKey(cleanSymbol)) {
                    List<Map<String, Object>> barList = (List<Map<String, Object>>) allBars.get(cleanSymbol);

                    List<StockBar> cryptoBars = new ArrayList<>();
                    for (Map<String, Object> barMap : barList) {
                        StockBar bar = new StockBar();
                        bar.setT(OffsetDateTime.parse(barMap.get("t").toString()));
                        bar.setO(Double.valueOf(barMap.get("o").toString()));
                        bar.setH(Double.valueOf(barMap.get("h").toString()));
                        bar.setL(Double.valueOf(barMap.get("l").toString()));
                        bar.setC(Double.valueOf(barMap.get("c").toString()));
                        bar.setV(Double.valueOf(barMap.get("v").toString()).longValue());
                        cryptoBars.add(bar);
                    }
                    // ถ้าเป็น Crypto แนะนำให้ Sort เวลาให้ชัวร์ก่อนส่งกลับ
                    cryptoBars.sort(Comparator.comparing(StockBar::getT));

                    return cryptoBars;
                }
            }
        } catch (Exception e) {
            log.error("❌ Error fetching crypto bars: " + e.getMessage());
        }
        return Collections.emptyList();
    }

    public Map<String, Object> getLatestCryptoQuote(String symbol) {
        // 1. จัดการ Symbol ให้สะอาด และต้องมี /USD
        String cleanSymbol = symbol.trim().toUpperCase();
        if (!cleanSymbol.contains("/")) {
            cleanSymbol = cleanSymbol + "/USD";
        }

        Map<String, Object> data = new HashMap<>();
        data.put("symbol", cleanSymbol);

        // Header สำหรับยิง API
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            // 2. ดึงราคา Trade ล่าสุด (Latest Trade)
            // URL: /v1beta3/crypto/us/latest/trades
            String tradeUrl = "https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=" + cleanSymbol;
            try {
                ResponseEntity<Map> response = restTemplate.exchange(URI.create(tradeUrl), HttpMethod.GET, entity,
                        Map.class);
                if (response.getBody() != null && response.getBody().containsKey("trades")) {
                    Map<String, Object> tradesMap = (Map<String, Object>) response.getBody().get("trades");
                    if (tradesMap.containsKey(cleanSymbol)) {
                        Map<String, Object> tradeDetail = (Map<String, Object>) tradesMap.get(cleanSymbol);
                        if (tradeDetail.get("p") != null) {
                            data.put("price", ((Number) tradeDetail.get("p")).doubleValue());
                        } else {
                            data.put("price", 0.0);
                        }
                        data.put("tradeTime", tradeDetail.get("t"));
                    }
                }
            } catch (Exception e) {
                log.error("Error fetching crypto trade: " + e.getMessage());
                data.put("price", 0.0);
            }

            // 3. ดึงราคา Bid/Ask ล่าสุด (Latest Quote)
            // URL: /v1beta3/crypto/us/latest/quotes
            String quoteUrl = "https://data.alpaca.markets/v1beta3/crypto/us/latest/quotes?symbols=" + cleanSymbol;
            try {
                ResponseEntity<Map> response = restTemplate.exchange(URI.create(quoteUrl), HttpMethod.GET, entity,
                        Map.class);
                if (response.getBody() != null && response.getBody().containsKey("quotes")) {
                    Map<String, Object> quotesMap = (Map<String, Object>) response.getBody().get("quotes");
                    if (quotesMap.containsKey(cleanSymbol)) {
                        Map<String, Object> quoteDetail = (Map<String, Object>) quotesMap.get(cleanSymbol);
                        // ap = Ask Price, as = Ask Size, bp = Bid Price, bs = Bid Size
                        data.put("askPrice", quoteDetail.get("ap"));
                        data.put("askSize", quoteDetail.get("as"));
                        data.put("bidPrice", quoteDetail.get("bp"));
                        data.put("bidSize", quoteDetail.get("bs"));
                    }
                }
            } catch (Exception e) {
                data.put("askPrice", 0.0);
                data.put("bidPrice", 0.0);
            }

            return data;

        } catch (Exception e) {
            log.error("Error getting crypto quote for " + cleanSymbol, e);
            return Map.of();
        }
    }

    public void setMaintenanceMode(boolean active, String message) {
        this.isMaintenanceActive = active;
        this.mintenanceMessage = message != null ? message : "ระบบกำลังปิดปรับปรุงชั่วคราว";
        log.info("System Maintenance Mode set to: {} ", active);
    }

    public Map<String, Object> getCurrentMaketStatus() {
        Map<String, Object> statusData = new HashMap<>();
        try {
            Clock clock = brokerService.getApi().broker().clock().queryMarketClock();
            boolean isAlpacaOpen = clock.getIsOpen();
            if (isMaintenanceActive) {
                statusData.put("status", "MAINTENANCE");
                statusData.put("isOpenForTrade", false);
                statusData.put("message", mintenanceMessage);
            } else if (isAlpacaOpen) {
                statusData.put("status", "OPEN");
                statusData.put("isOpenForTrade", true);
                statusData.put("message", "ตลาดเปิดทำการปกติ");
            } else {
                statusData.put("status", "CLOSED");
                statusData.put("isOpenForTrade", false);
                statusData.put("message", "ตลาดปิดทำการ");
            }
            statusData.put("nextOpen", clock.getNextOpen().toString());
            statusData.put("nextClose", clock.getNextClose().toString());
        } catch (Exception e) {
            log.error("❌ General Error: {}", e.getMessage(), e);
            statusData.put("status", "MAINTENANCE");
            statusData.put("isOpenForTrade", false);
            statusData.put("message", "ระบบขัดข้องภายใน");
        }
        return statusData;
    }

    /// code ไว้ดึงข้อมูลตัวหุ้น มา และเก็บใน menony
    @Cacheable("allTradableAssets")
    public List<StockSearchDto> getTradableAssets() {
        try {
            // ดึงข้อมูลหุ้นทั้งหมดที่มีสถานะ ACTIVE และเป็นหุ้น US
            // ลองเปลี่ยนเป็นแบบนี้ดูครับ
            List<Assets> assets = alpacaAPI.trader().assets().getV2Assets("active", "us_equity", null, null);

            // แมปข้อมูลเป็น DTO เพื่อส่งเฉพาะสิ่งที่หน้าบ้านต้องใช้
            // นำข้อมูล List<Assets> มาแปลงเป็น DTO
            return assets.stream()
                    // เช็กก่อนว่าหุ้นตัวนี้ยอมให้เทรดบน Alpaca จริงๆ (getTradable มักคืนค่าเป็น
                    // Boolean)
                    .filter(asset -> Boolean.TRUE.equals(asset.getTradable()))
                    .map(asset -> new StockSearchDto(
                            asset.getSymbol(),
                            asset.getName(),
                            asset.getExchange().toString()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            throw new RuntimeException("ไม่สามารถดึงข้อมูลรายชื่อหุ้นจาก Alpaca API ได้: " + e.getMessage());
        }
    }

    /// code Search Function หุ้น คือรับค่า keyword แต่รับมาจากหน้าบ้าน
    public List<StockSearchDto> searchAssets(String keyword) {
        List<StockSearchDto> allAssets = getTradableAssets();

        if (keyword == null || keyword.trim().length() < 2) {
            return List.of();
        }

        String searchString = keyword.trim().toLowerCase();

        return allAssets.stream()
                .filter(asset -> (asset.getSymbol() != null && asset.getSymbol().toLowerCase().startsWith(searchString))
                        ||
                        (asset.getName() != null && asset.getName().toLowerCase().contains(searchString)))
                .limit(20)
                .collect(Collectors.toList());
    }
}