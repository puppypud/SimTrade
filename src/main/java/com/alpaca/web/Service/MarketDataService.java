package com.alpaca.web.Service;

import com.alpaca.web.dto.StockSearchDto;
import com.alpaca.web.dto.StockSearchResultDTO;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.MarketDataWebsocketSourceType;
import net.jacobpeterson.alpaca.model.util.apitype.TraderAPIEndpointType;
import net.jacobpeterson.alpaca.openapi.broker.model.Clock;
import net.jacobpeterson.alpaca.openapi.trader.model.Assets;
import org.apache.commons.text.similarity.JaroWinklerDistance;
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import jakarta.annotation.PostConstruct; // Import เพิ่ม
import org.slf4j.Logger;
import org.springframework.context.annotation.Lazy;
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

import java.time.format.DateTimeFormatter;
import java.time.*;
import java.net.URI;

import com.alpaca.web.Repository.StockAssetRepository;
import com.alpaca.web.entity.StockAsset;
import org.springframework.data.jpa.domain.Specification;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.stream.Collectors;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class MarketDataService {
    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private final StockAnalysisService stockAnalysisService;
    private final StockAssetRepository stockAssetRepository;
    private final JaroWinklerDistance distanceCalculator = new JaroWinklerDistance();  // ไว้ทำSearch แบบใส่คำผิดได้
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

    public MarketDataService(StockAnalysisService stockAssetRepository, StockAnalysisService stockAnalysisService, StockAssetRepository stockAssetRepository1, @Lazy BrokerService brokerService /* ถ้ามี Service อื่นๆ รับมาด้วยก็ใส่ต่อท้ายได้เลย */) {
        this.stockAnalysisService = stockAnalysisService;
        this.stockAssetRepository = stockAssetRepository1;
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
                timeframe = "2Min";
                // แก้ให้รองรับวันหยุด: ถอยไปหาวันทำการล่าสุด (จันทร์-ศุกร์)
                DayOfWeek dow = nowNY.getDayOfWeek();
                if (dow == DayOfWeek.SATURDAY) {
                    // เสาร์ → ถอยไปศุกร์ (1 วัน)
                    startTime = nowNY.toLocalDate().minusDays(1).atTime(9, 30).atZone(NY_ZONE);
                } else if (dow == DayOfWeek.SUNDAY) {
                    // อาทิตย์ → ถอยไปศุกร์ (2 วัน)
                    startTime = nowNY.toLocalDate().minusDays(2).atTime(9, 30).atZone(NY_ZONE);
                } else if (dow == DayOfWeek.MONDAY && nowNY.isBefore(targetOpen)) {
                    // จันทร์ก่อนตลาดเปิด → ถอยไปศุกร์ (3 วัน)
                    startTime = nowNY.toLocalDate().minusDays(3).atTime(9, 30).atZone(NY_ZONE);
                } else {
                    startTime = targetOpen;
                    if (nowNY.isBefore(targetOpen)) {
                        startTime = targetOpen.minusDays(1);
                    }
                }
                break;

            case "1W":
                // ดู 1 สัปดาห์
                timeframe = "1Hour"; // หรือ 1Hour
                startTime = targetOpen.minusWeeks(1);
                break;

            case "5D":
                timeframe = "15Min";
                startTime = targetOpen.minusDays(8); // ถอยไป 8 วันเผื่อเสาร์อาทิตย์ เพื่อให้ได้ 5 วันทำการเต็มๆ
                break;

            case "1M":
                timeframe = "30Min";
                startTime = targetOpen.minusMonths(1).minusDays(3); // เผื่อ buffer 3 วัน
                break;

            case "6M":
                timeframe = "1Day";
                startTime = targetOpen.minusMonths(6).minusDays(5);
                break;

            case "1Y":
                timeframe = "1Day";
                startTime = targetOpen.minusYears(1).minusDays(7);
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
                "https://data.alpaca.markets/v2/stocks/%s/bars?timeframe=%s&feed=iex&start=%s&limit=%d&adjustment=split",
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

                Map<String, Object> result = new HashMap<>();
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
                statusData.put("isMaintenanceMode", true);
                statusData.put("isOpenForTrade", false);
                statusData.put("message", mintenanceMessage);
            } else if (isAlpacaOpen) {
                statusData.put("status", "OPEN");
                statusData.put("isMaintenanceMode", false);
                statusData.put("isOpenForTrade", true);
                statusData.put("message", "ตลาดเปิดทำการปกติ");
            } else {
                statusData.put("status", "CLOSED");
                statusData.put("isMaintenanceMode", false);
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
    public List<StockSearchResultDTO> getTradableAssets() {
        try {
            // ดึงข้อมูลหุ้นสหรัฐและคริปโตมารวมกัน
            List<Assets> usAssets = alpacaAPI.trader().assets().getV2Assets("active", "us_equity", null, null);
            List<Assets> cryptoAssets = alpacaAPI.trader().assets().getV2Assets("active", "crypto", null, null);

            List<Assets> combined = new ArrayList<>();
            if (usAssets != null) combined.addAll(usAssets);
            if (cryptoAssets != null) combined.addAll(cryptoAssets);

            return combined.stream()
                    .filter(asset -> Boolean.TRUE.equals(asset.getTradable()))
                    .map(asset -> {
                        StockSearchResultDTO dto = new StockSearchResultDTO();
                        dto.setSymbol(asset.getSymbol());
                        dto.setName(asset.getName());
                        dto.setExchange(asset.getExchange() != null ? asset.getExchange().toString() : "CRYPTO");
                        dto.setStatus(asset.getStatus() != null ? asset.getStatus().toString() : "ACTIVE");
                        dto.setStatus(asset.getStatus().toString());
                        return dto;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching Alpaca assets: " + e.getMessage());
        }
    }

   /* /// code Search Function หุ้น คือรับค่า keyword แต่รับมาจากหน้าบ้าน  *** code นี้พังเพราะแก้ เดียวกลับมาใช้ถ้าอันใหม่ พัง
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
    }*/

    /**
     *  ฟังก์ชันใหม่: ดึงข้อมูลกราฟย้อนหลังเพื่อการวิเคราะห์ (Analytics)
     * ต่างจาก getStockBars ปกติตรงที่ระบุ start/end ได้อิสระ
     */
    public List<StockBar> getHistoricalBars(String symbol, ZonedDateTime start, ZonedDateTime end, String timeframe,
            Integer limit) {
        String cleanSymbol = symbol.trim().toUpperCase();

        if (cleanSymbol.contains("/")) {
            return getCryptoHistoricalBars(cleanSymbol, start, end, timeframe, limit);
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
        String startStr = start.withZoneSameInstant(ZoneOffset.UTC).format(formatter);
        String endStr = end.withZoneSameInstant(ZoneOffset.UTC).format(formatter);

        // ใช้ limit ที่ส่งมา หรือ default 1000
        int actualLimit = (limit != null && limit > 0) ? limit : 1000;

        String urlString = String.format(
                "https://data.alpaca.markets/v2/stocks/%s/bars?timeframe=%s&feed=iex&start=%s&end=%s&limit=%d&adjustment=split",
                cleanSymbol, timeframe, startStr, endStr, actualLimit);

        return fetchBarsFromApi(urlString);
    }

    private List<StockBar> getCryptoHistoricalBars(String symbol, ZonedDateTime start, ZonedDateTime end,
            String timeframe, Integer limit) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
        String startStr = start.withZoneSameInstant(ZoneOffset.UTC).format(formatter);

        int actualLimit = (limit != null && limit > 0) ? limit : 1000;

        String urlString = String.format(
                "https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=%s&timeframe=%s&limit=%d&start=%s",
                symbol, timeframe, actualLimit, startStr);

        // Note: Crypto API อาจจะไม่รองรับ parameter 'end' ในบาง endpoint ต้องเช็ค doc
        // แต่ start ใช้ได้แน่นอน

        return fetchBarsFromApi(urlString);
    }

    private List<StockBar> fetchBarsFromApi(String urlString) {
        URI uri = URI.create(urlString);
        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("bars")) {
                Object barsObj = response.getBody().get("bars");
                List<Map<String, Object>> barsData;

                if (barsObj instanceof Map) { // Crypto return เป็น Map<Symbol, List>
                    Map<String, Object> barsMap = (Map<String, Object>) barsObj;
                    if (barsMap.isEmpty())
                        return Collections.emptyList();
                    // เอา key แรก (symbol)
                    String key = barsMap.keySet().iterator().next();
                    barsData = (List<Map<String, Object>>) barsMap.get(key);
                } else { // Stock return เป็น List
                    barsData = (List<Map<String, Object>>) barsObj;
                }

                List<StockBar> stockBars = new ArrayList<>();
                if (barsData != null) {
                    for (Map<String, Object> barMap : barsData) {
                        StockBar bar = new StockBar();
                        String tStr = (String) barMap.get("t");
                        bar.setT(OffsetDateTime.parse(tStr)); // Keep UTC
                        bar.setO(Double.valueOf(barMap.get("o").toString()));
                        bar.setH(Double.valueOf(barMap.get("h").toString()));
                        bar.setL(Double.valueOf(barMap.get("l").toString()));
                        bar.setC(Double.valueOf(barMap.get("c").toString()));
                        bar.setV(Double.valueOf(barMap.get("v").toString()).longValue());
                        stockBars.add(bar);
                    }
                }
                return stockBars;
            }
        } catch (Exception e) {
            log.error("❌ Error fetching historical bars: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    public List<StockSearchResultDTO> hybridSearchAndFilter(
            String keyword, String category, String industry, String sortBy, String direction) {

        List<StockSearchResultDTO> results = new ArrayList<>();

        // Logic เลือกแหล่งข้อมูล
        if (category != null || industry != null) {
            // ดึงจาก DB

            results = stockAssetRepository.hybridSearchDb(keyword, category, industry)
                    .stream().map(asset -> {
                        // ✅ แนะนำให้ใช้ Setter (หรือ Builder) แทน Constructor ยาวๆ เพื่อป้องกันการใส่ค่าผิดตำแหน่ง
                        StockSearchResultDTO dto = new StockSearchResultDTO();
                        dto.setSymbol(asset.getSymbol());
                        dto.setName(asset.getName());
                        dto.setExchange(asset.getAssetClass());
                        dto.setAssetClass(asset.getAssetClass());
                        dto.setStatus("ACTIVE");
                        dto.setCategory(asset.getCategory());
                        dto.setIndustry(asset.getIndustry());

                        // ✅ ดึงข้อมูลการเงินจาก DB ใส่ DTO
                        dto.setMarketcap(asset.getMarketCap());
                        dto.setBata(asset.getBeta());
                        dto.setVolume(asset.getAvgVolume()); // ใน Entity ของคุณใช้ชื่อ avgVolume

                        return dto;
                    })
                    .collect(Collectors.toList());
        } else {
            // ดึงจาก API (Search ทั่วโลก)
            List<StockSearchResultDTO> allAssets = getTradableAssets();
            String searchStr = keyword != null ? keyword.trim().toLowerCase() : "";

            if (searchStr.isEmpty()) {
                return new ArrayList<>();
            }

            results = allAssets.stream()
                    // ✅ 2. คัดกรองข้อมูลก่อน
                    .filter(a -> {
                        String sym = a.getSymbol() != null ? a.getSymbol().toLowerCase() : "";
                        String name = a.getName() != null ? a.getName().toLowerCase() : "";

                        // กฎพิเศษ: ถ้าพิมพ์ตัวเดียว บังคับหาแค่ Symbol ที่ขึ้นต้นด้วยตัวนั้นเท่านั้น (กันหุ้น B, C, D โผล่มา)
                        if (searchStr.length() == 1) {
                            return sym.startsWith(searchStr);
                        }

                        // ถ้าพิมพ์ 2 ตัวขึ้นไป เอาตัวที่เกี่ยวข้องกัน (คะแนน > 0)
                        return getSearchScore(sym, name, searchStr) > 0;
                    })
                    // ✅ 3. เรียงลำดับ (Symbol ต้องมาก่อน Name เสมอ)
                    .sorted((a, b) -> {
                        String symA = a.getSymbol().toLowerCase();
                        String nameA = a.getName() != null ? a.getName().toLowerCase() : "";
                        String symB = b.getSymbol().toLowerCase();
                        String nameB = b.getName() != null ? b.getName().toLowerCase() : "";

                        int scoreA = getSearchScore(symA, nameA, searchStr);
                        int scoreB = getSearchScore(symB, nameB, searchStr);

                        // กฎที่ 1: เรียงตามคะแนนความแม่นยำ (คะแนนมากอยู่บน)
                        if (scoreA != scoreB) {
                            return Integer.compare(scoreB, scoreA);
                        }

                        // กฎที่ 2: ถ้าคะแนนเท่ากัน ให้ตัวย่อที่ "สั้นกว่า" อยู่บน (เช่น A มาก่อน AA)
                        if (symA.length() != symB.length()) {
                            return Integer.compare(symA.length(), symB.length());
                        }

                        // กฎที่ 3: นอกเหนือจากนั้นเรียงตามตัวอักษร A-Z
                        return symA.compareTo(symB);
                    })
                    .limit(50)
                    .collect(Collectors.toList());
        }

        // ===== ระบบเรียงลำดับ (Sorting) ขั้นสูง =====
        if (sortBy != null) {
            Comparator<StockSearchResultDTO> comparator;
            switch (sortBy.toLowerCase()) {
                case "name":
                    comparator = Comparator.comparing(StockSearchResultDTO::getName, Comparator.nullsLast(Comparator.naturalOrder()));
                    break;
                case "marketcap": // ✅ เพิ่มการเรียงตามมูลค่าตลาด
                    comparator = Comparator.comparing(StockSearchResultDTO::getMarketcap, Comparator.nullsLast(Comparator.naturalOrder()));
                    break;
                case "volume":    // ✅ เพิ่มการเรียงตามปริมาณซื้อขาย
                    comparator = Comparator.comparing(StockSearchResultDTO::getVolume, Comparator.nullsLast(Comparator.naturalOrder()));
                    break;
                case "beta":      // ✅ เพิ่มการเรียงตามความผันผวน
                    comparator = Comparator.comparing(StockSearchResultDTO::getBata, Comparator.nullsLast(Comparator.naturalOrder()));
                    break;
                case "symbol":
                default:
                    comparator = Comparator.comparing(StockSearchResultDTO::getSymbol, Comparator.nullsLast(Comparator.naturalOrder()));
                    break;
            }

            if ("desc".equalsIgnoreCase(direction)) {
                comparator = comparator.reversed();
            }
            results.sort(comparator);
        }

        return results;
    }
    //งก์ชันกำหนดลำดับความสำคัญ (Symbol ต้องมาก่อน Name)

    /**
     * ฟังก์ชัน Filter หุ้นแบบ Advanced
     * ใช้ JPA Specification สร้าง Dynamic Query แล้วเสริมข้อมูลราคาจาก Alpaca API
     */
    public List<StockSearchResultDTO> filterStocks(StockSearchDto filter) {
        log.info("🔍 Filter Request: sectors={}, marketCapTiers={}, priceMin={}, priceMax={}, assetTypes={}, categories={}",
                filter.getSectors(), filter.getMarketCapTiers(), filter.getPriceMin(), filter.getPriceMax(),
                filter.getAssetTypes(), filter.getCategories());

        // 1. สร้าง Specification จาก Filter แล้ว Query ลง PostgreSQL
        Specification<StockAsset> spec = StockAssetSpecification.fromFilter(filter);
        List<StockAsset> dbResults = stockAssetRepository.findAll(spec);

        log.info("📊 Found {} stocks from DB filter", dbResults.size());

        // 2. จำกัดผลลัพธ์ไม่เกิน 50 ตัว (เพื่อไม่ให้ยิง API เยอะเกินไป)
        List<StockAsset> limitedResults = dbResults.stream().limit(50).collect(Collectors.toList());

        // 3. Batch processing (Optimized API calls)
        List<String> usSymbols = limitedResults.stream()
                .filter(a -> "US_EQUITY".equals(a.getAssetClass()))
                .map(StockAsset::getSymbol)
                .collect(Collectors.toList());

        List<String> cryptoSymbols = limitedResults.stream()
                .filter(a -> "CRYPTO".equals(a.getAssetClass()))
                .map(a -> {
                    String sym = a.getSymbol().toUpperCase();
                    return sym.contains("/") ? sym : sym + "/USD";
                })
                .collect(Collectors.toList());

        Map<String, Double> allPrices = new HashMap<>();
        Map<String, Double> allReturns = new HashMap<>();

        if (!usSymbols.isEmpty()) {
            allPrices.putAll(getBatchLatestPrices(usSymbols, false));
            allReturns.putAll(getBatch1YearReturns(usSymbols, false));
        }
        if (!cryptoSymbols.isEmpty()) {
            allPrices.putAll(getBatchLatestPrices(cryptoSymbols, true));
            allReturns.putAll(getBatch1YearReturns(cryptoSymbols, true));
        }

        List<StockSearchResultDTO> enrichedResults = new ArrayList<>();
        for (StockAsset asset : limitedResults) {
            StockSearchResultDTO dto = new StockSearchResultDTO();
            dto.setSymbol(asset.getSymbol());
            dto.setName(asset.getName());
            dto.setExchange(asset.getAssetClass());
            dto.setAssetClass(asset.getAssetClass());
            dto.setStatus("ACTIVE");
            dto.setCategory(asset.getCategory());
            dto.setIndustry(asset.getIndustry());
            dto.setMarketcap(asset.getMarketCap());
            dto.setBata(asset.getBeta());
            dto.setVolume(asset.getAvgVolume());
            dto.setMarketCapTier(calculateMarketCapTier(asset.getMarketCap()));

            String symKey = asset.getSymbol().toUpperCase();
            if ("CRYPTO".equals(asset.getAssetClass()) && !symKey.contains("/")) {
                symKey = symKey + "/USD";
            }

            // Assign pre-fetched price
            if (allPrices.containsKey(symKey)) {
                dto.setCurrentPrice(BigDecimal.valueOf(allPrices.get(symKey)).setScale(2, RoundingMode.HALF_UP));
            } else if (allPrices.containsKey(asset.getSymbol().toUpperCase())) {
                dto.setCurrentPrice(BigDecimal.valueOf(allPrices.get(asset.getSymbol().toUpperCase())).setScale(2, RoundingMode.HALF_UP));
            }

            // Assign pre-fetched 1Y return
            if (allReturns.containsKey(symKey)) {
                dto.setOneYearReturnPct(BigDecimal.valueOf(allReturns.get(symKey)).setScale(2, RoundingMode.HALF_UP));
            } else if (allReturns.containsKey(asset.getSymbol().toUpperCase())) {
                dto.setOneYearReturnPct(BigDecimal.valueOf(allReturns.get(asset.getSymbol().toUpperCase())).setScale(2, RoundingMode.HALF_UP));
            }

            enrichedResults.add(dto);
        }

        // 4. กรองตามราคา (Post-filter เพราะราคาดึงมาจาก API)
        if (filter.getPriceMin() != null || filter.getPriceMax() != null) {
            enrichedResults = enrichedResults.stream()
                    .filter(dto -> {
                        if (dto.getCurrentPrice() == null) return false;
                        if (filter.getPriceMin() != null && dto.getCurrentPrice().compareTo(filter.getPriceMin()) < 0) return false;
                        if (filter.getPriceMax() != null && dto.getCurrentPrice().compareTo(filter.getPriceMax()) > 0) return false;
                        return true;
                    })
                    .collect(Collectors.toList());
        }

        log.info("✅ Filter complete. Returning {} enriched results", enrichedResults.size());
        return enrichedResults;
    }

    /**
     * คำนวณ Market Cap Tier จากมูลค่าตลาด
     */
    private String calculateMarketCapTier(Long marketCap) {
        if (marketCap == null) return "UNKNOWN";
        if (marketCap >= 200_000_000_000L) return "MEGA";
        if (marketCap >= 10_000_000_000L) return "LARGE";
        if (marketCap >= 2_000_000_000L) return "MID";
        if (marketCap >= 300_000_000L) return "SMALL";
        return "MICRO";
    }

    private Map<String, Double> getBatchLatestPrices(List<String> symbols, boolean isCrypto) {
        if (symbols == null || symbols.isEmpty()) return Collections.emptyMap();
        Map<String, Double> results = new HashMap<>();

        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            for (int i = 0; i < symbols.size(); i += 50) {
                int end = Math.min(i + 50, symbols.size());
                List<String> chunk = symbols.subList(i, end);
                String symbolsParam = String.join(",", chunk);

                if (!isCrypto) {
                    String url = "https://data.alpaca.markets/v2/stocks/snapshots?symbols=" + symbolsParam + "&feed=iex";
                    ResponseEntity<Map> response = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, Map.class);
                    if (response.getBody() != null) {
                        Map<String, Map<String, Object>> body = (Map<String, Map<String, Object>>) response.getBody();
                        for (Map.Entry<String, Map<String, Object>> entry : body.entrySet()) {
                            Map<String, Object> snapshot = entry.getValue();
                            if (snapshot.containsKey("latestTrade")) {
                                Map<String, Object> trade = (Map<String, Object>) snapshot.get("latestTrade");
                                if (trade != null && trade.get("p") != null) {
                                    results.put(entry.getKey(), ((Number) trade.get("p")).doubleValue());
                                }
                            }
                        }
                    }
                } else {
                    String url = "https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=" + symbolsParam;
                    ResponseEntity<Map> response = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, Map.class);
                    if (response.getBody() != null && response.getBody().containsKey("trades")) {
                        Map<String, Map<String, Object>> trades = (Map<String, Map<String, Object>>) response.getBody().get("trades");
                        for (Map.Entry<String, Map<String, Object>> entry : trades.entrySet()) {
                            Map<String, Object> tradeDetail = entry.getValue();
                            if (tradeDetail != null && tradeDetail.get("p") != null) {
                                String symbol = entry.getKey().replace("/USD", "");
                                results.put(symbol, ((Number) tradeDetail.get("p")).doubleValue());
                                results.put(entry.getKey(), ((Number) tradeDetail.get("p")).doubleValue());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("❌ Error fetching batch prices: {}", e.getMessage());
        }
        return results;
    }

    private Map<String, Double> getBatch1YearReturns(List<String> symbols, boolean isCrypto) {
        if (symbols == null || symbols.isEmpty()) return Collections.emptyMap();
        Map<String, Double> results = new HashMap<>();

        ZonedDateTime now = ZonedDateTime.now(NY_ZONE);
        ZonedDateTime oneYearAgo = now.minusYears(1);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
        String startStr = oneYearAgo.withZoneSameInstant(ZoneOffset.UTC).format(formatter);
        String endStr = now.withZoneSameInstant(ZoneOffset.UTC).format(formatter);

        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", apiKey.trim());
        headers.set("APCA-API-SECRET-KEY", apiSecret.trim());
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            for (int i = 0; i < symbols.size(); i += 50) {
                int end = Math.min(i + 50, symbols.size());
                List<String> chunk = symbols.subList(i, end);
                String symbolsParam = String.join(",", chunk);

                String url;
                if (!isCrypto) {
                    url = String.format("https://data.alpaca.markets/v2/stocks/bars?symbols=%s&timeframe=1Month&feed=iex&start=%s&end=%s&limit=15&adjustment=split",
                            symbolsParam, startStr, endStr);
                } else {
                    url = String.format("https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=%s&timeframe=1Month&start=%s&limit=15",
                            symbolsParam, startStr);
                }

                ResponseEntity<Map> response = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, Map.class);
                if (response.getBody() != null && response.getBody().containsKey("bars")) {
                    Map<String, List<Map<String, Object>>> barsMap = (Map<String, List<Map<String, Object>>>) response.getBody().get("bars");
                    for (Map.Entry<String, List<Map<String, Object>>> entry : barsMap.entrySet()) {
                        List<Map<String, Object>> barsData = entry.getValue();
                        if (barsData != null && barsData.size() >= 2) {
                            double oldPrice = Double.parseDouble(barsData.get(0).get("c").toString());
                            double newPrice = Double.parseDouble(barsData.get(barsData.size() - 1).get("c").toString());
                            if (oldPrice > 0) {
                                double returnPct = ((newPrice - oldPrice) / oldPrice) * 100.0;
                                String symbolKey = entry.getKey().replace("/USD", "");
                                results.put(symbolKey, returnPct);
                                results.put(entry.getKey(), returnPct);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("❌ Error fetching batch 1Y returns: {}", e.getMessage());
        }
        return results;
    }

    private int getSearchScore(String symbol, String name, String searchStr) {

        // 🏆 กลุ่มที่ 1: พิจารณา รหัสหุ้น (Symbol) ก่อน - คะแนน 60-100
        if (symbol.equals(searchStr)) return 100;       // 1.1 รหัสตรงเป๊ะ
        if (symbol.startsWith(searchStr)) return 80;    // 1.2 รหัสขึ้นต้นด้วย (เช่น AAPL)
        if (symbol.contains(searchStr)) return 60;      // 1.3 รหัสมีคำซ่อนอยู่

        // 🥈 กลุ่มที่ 2: พิจารณา ชื่อบริษัท (Name) ไว้ทีหลัง - คะแนน 10-40
        if (name.equals(searchStr)) return 40;          // 2.1 ชื่อตรงเป๊ะ
        if (name.startsWith(searchStr)) return 20;      // 2.2 ชื่อบริษัทขึ้นต้นด้วย
        if (name.contains(searchStr)) return 10;        // 2.3 ชื่อบริษัทมีคำซ่อนอยู่

        return 0; // ไม่เกี่ยวข้องกันเลย ตัดทิ้ง
    }
}
