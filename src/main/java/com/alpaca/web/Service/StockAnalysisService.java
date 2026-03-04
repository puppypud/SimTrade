package com.alpaca.web.Service;

import com.alpaca.web.Repository.StockAssetRepository;
import com.alpaca.web.dto.FinnhubFinancials;
import com.alpaca.web.dto.FinnhubProfileDTO;
import com.alpaca.web.dto.FinnhubStockDTO;
import com.alpaca.web.dto.StockInfoDatabaseDTO;
import com.alpaca.web.entity.StockAsset;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class StockAnalysisService {
    Dotenv dotenv = Dotenv.load();

    private final String apiKeystock = dotenv.get("FMP_API_KEY");
    private final String baseUrlstock = "https://finnhub.io/api/v1";
    private final StockAssetRepository stockAssetRepository;
    private static final Logger log = LoggerFactory.getLogger(StockAnalysisService.class);

    public StockAnalysisService(StockAssetRepository stockAssetRepository) {
        this.stockAssetRepository = stockAssetRepository;
    }

    private StockAsset createStockEntity(StockInfoDatabaseDTO dto) {
        StockAsset s = new StockAsset();
        s.setSymbol(dto.getSymbol());
        s.setName(dto.getName());
        s.setAssetClass("US_EQUITY"); // หรือดึงจาก DTO ถ้ามี
        s.setBeta(dto.getBeta());
        s.setMarketCap(dto.getMarketCap());
        s.setAvgVolume(dto.getVolume());
        s.setCategory(dto.getCategory());
        s.setIndustry(dto.getIndustry()); // 👈 ต้องมีตัวนี้ ข้อมูลใน DB ถึงจะไม่เป็น Null
        s.setTradable(true);
        return s;
    }

    @PostConstruct
    public void seedData() {
        if (stockAssetRepository.count() == 0) {
            log.info("📌 Database is empty. Seeding 12 bulletproof stocks from Finnhub API...");

            List<String> seedSymbols = Arrays.asList(
                    "KO", "WMT", "LLY", // กลุ่มมั่นคง (Stable)
                    "NVDA", "TSLA", "NFLX", // กลุ่มกระแส (Trending)
                    "JPM", "DIS", "NKE", // กลุ่มเล่นรอบ (Swing)
                    "MSTR", "COIN", "MARA" // กลุ่มเก็งกำไร (Speculative)
            );

            for (String symbol : seedSymbols) {
                try {
                    log.info("⏳ กำลังดึงและบันทึกข้อมูลเริ่มต้นสำหรับ: {}", symbol);

                    // 1. ไปเรียกฟังก์ชันดึง API
                    StockInfoDatabaseDTO dto = fetchStockDataFromApi(symbol);

                    if (dto != null) {
                        // 2. เซฟเฉพาะ 12 ตัวนี้ลง Database
                        StockAsset newStock = new StockAsset();
                        newStock.setSymbol(dto.getSymbol());
                        newStock.setName(dto.getName());
                        newStock.setAssetClass("US_EQUITY");
                        newStock.setBeta(dto.getBeta());
                        newStock.setMarketCap(dto.getMarketCap());
                        newStock.setAvgVolume(dto.getVolume());
                        newStock.setCategory(dto.getCategory());
                        newStock.setIndustry(dto.getIndustry());
                        newStock.setTradable(true);

                        stockAssetRepository.save(newStock);
                    }

                    // หน่วงเวลา 1.5 วินาที กัน API Limit
                    Thread.sleep(1500);
                } catch (Exception e) {
                    log.error("❌ เกิดข้อผิดพลาดตอนดึงข้อมูล {}: {}", symbol, e.getMessage());
                }
            }
            log.info("✅ Successfully loaded 12 bulletproof stocks into Database!");
        }
    }

    public String calculateCategory(BigDecimal beta, BigDecimal marketCap, Long volume, BigDecimal pe, String industry,
            BigDecimal yearHigh, BigDecimal yearLow, BigDecimal currentPrice) {
        double absBeta = (beta != null) ? Math.abs(beta.doubleValue()) : 1.0;
        double capBillion = (marketCap != null) ? marketCap.doubleValue() / 1_000_000_000.0 : 0.0;
        long vol = (volume != null) ? volume : 0L;
        double peValue = (pe != null) ? pe.doubleValue() : -1.0;
        String ind = (industry != null) ? industry.toLowerCase() : "";

        // ── ตำแหน่งราคาในช่วง 52 สัปดาห์ ────────────────────────────────────────
        double pricePosition = 0.5;
        if (yearHigh != null && yearLow != null && currentPrice != null) {
            double high = yearHigh.doubleValue();
            double low = yearLow.doubleValue();
            double price = currentPrice.doubleValue();
            if (high > low)
                pricePosition = (price - low) / (high - low);
        }

        // ── กระดานคะแนน ──────────────────────────────────────────────────────────
        int stableScore = 0;
        int trendScore = 0;
        int swingScore = 0; // ★ เพิ่ม Swing Score แยกออกมา
        int speculativeScore = 0;

        // ════════════════════════════════════════════════════════════════
        // 🚨 FAST-TRACK: Beta สูงมากผิดปกติ (>= 2.5) = เก็งกำไรทันที
        // ครอบคลุม MSTR (Bitcoin proxy), COIN (Crypto exchange) ที่
        // Finnhub จัด industry เป็น "Software" หรือ "Financial" ไม่ใช่ "Crypto"
        // ════════════════════════════════════════════════════════════════
        if (absBeta >= 2.5) {
            return "เก็งกำไร (Speculative)";
        }

        // ════════════════════════════════════════════════════════════════
        // 1. MARKET CAP — ขนาดบริษัท
        // ★ แก้: Banking ใหญ่ (JPM) ไม่ใช่มั่นคง เพราะ Cyclical กับ Economy
        // ให้ Cap >= 100B ได้ stableScore เฉพาะเมื่อ Beta ต่ำ (จะ combine กันใน step 2)
        // ════════════════════════════════════════════════════════════════
        if (capBillion >= 100.0)
            stableScore += 2;
        else if (capBillion >= 10.0)
            swingScore += 1; // Mid-cap → เล่นรอบ
        else if (capBillion < 2.0)
            speculativeScore += 3; // Small-cap → เก็งกำไรหนักขึ้น

        // ════════════════════════════════════════════════════════════════
        // 2. BETA — ความผันผวนเทียบตลาด
        // แยกชัดว่า "บริษัทใหญ่สวิงแรง = กระแส" vs "บริษัทเล็กสวิงแรง = เก็งกำไร"
        // ★ แก้: Beta 1.0-1.1 (เช่น JPM=1.07) ไม่ควรได้ stableScore
        // เพราะ Beta > 1.0 หมายถึงสวิงกว่าตลาด ไม่ใช่หุ้นนิ่ง
        // ════════════════════════════════════════════════════════════════
        if (absBeta <= 0.8)
            stableScore += 3; // Defensive แท้จริง
        else if (absBeta <= 1.0)
            stableScore += 1; // นิ่งกว่าตลาดนิดหน่อย
        // 1.0 < Beta <= 1.6: Swing Zone (DIS=1.46, NKE=1.30 ไม่ใช่ Trending)
        else if (absBeta <= 1.6) {
            if (capBillion >= 10.0)
                swingScore += 2;
            else
                speculativeScore += 2;
        } else {
            // Beta > 1.6 = กระแสจริงหรือเสี่ยงสูง
            if (capBillion >= 50.0)
                trendScore += 3; // Tech ยักษ์ที่คนแห่เทรด เช่น NVDA, TSLA
            else if (capBillion >= 10.0)
                swingScore += 2;
            else
                speculativeScore += 3; // ตัวเล็กสวิงจัด = เสี่ยง
        }

        // ════════════════════════════════════════════════════════════════
        // 3. P/E — มูลค่าและความคาดหวัง
        // ★ แก้: P/E ติดลบ + บริษัทเล็ก → Speculative ชัดขึ้น
        // ════════════════════════════════════════════════════════════════
        if (peValue > 0 && peValue <= 20)
            stableScore += 2; // Value / Defensive
        else if (peValue > 20 && peValue <= 40)
            swingScore += 1;
        else if (peValue > 40)
            trendScore += 2; // Growth / Hype
        else if (peValue < 0) {
            // P/E ติดลบ = ขาดทุน
            if (capBillion < 10.0)
                speculativeScore += 3; // เล็ก+ขาดทุน → เก็งกำไรหนัก
            else
                swingScore += 1; // ใหญ่แต่ขาดทุน (เช่น AAL, DIS) → เล่นรอบ
        }

        // ════════════════════════════════════════════════════════════════
        // 4. VOLUME — ★ แก้สำคัญ: Volume สูงอย่างเดียว ≠ กระแส
        // ต้องมี Beta สูงด้วยจึงถือว่ากระแส
        // ════════════════════════════════════════════════════════════════
        if (vol > 30_000_000) {
            if (absBeta >= 1.3)
                trendScore += 2; // Volume มาก + สวิงแรง = กระแสจริง
            else if (absBeta >= 1.0)
                swingScore += 1; // Volume มาก แต่ปกติ = เล่นรอบ
            // Beta ต่ำ: ไม่ให้คะแนน (เช่น KO มี Volume สูงแต่ไม่ใช่กระแส)
        } else if (vol < 1_000_000) {
            speculativeScore += 1; // ซื้อขายน้อย = สภาพคล่องต่ำ → เสี่ยงขึ้น
        }

        // ════════════════════════════════════════════════════════════════
        // 5. INDUSTRY — ★ แก้: เพิ่ม keyword ให้ครอบคลุมหุ้นยอดนิยม
        // ════════════════════════════════════════════════════════════════

        // กลุ่มมั่นคง — Defensive / Consumer Staples
        if (ind.contains("util") || ind.contains("defens") ||
                ind.contains("food") || ind.contains("beverag") ||
                ind.contains("consumer staples") || ind.contains("household") ||
                ind.contains("pharmaceuticals") || ind.contains("healthcare") ||
                ind.contains("drug")) {
            stableScore += 2;
        }

        // กลุ่มกระแส — Semiconductor, EV, Cloud (ไม่รวม Software เพราะ MSTR จะโดน
        // Fast-Track ไปก่อน)
        else if (ind.contains("semiconductor") || ind.contains("internet") ||
                ind.contains("cloud") || ind.contains("social media") ||
                ind.contains("electric vehicle") || ind.contains("ev ")) {
            trendScore += 2;
        }

        // กลุ่มกระแส — Software (NVDA จริงๆ เป็น Semiconductor แต่ Software ทั่วไปก็
        // Trend)
        else if (ind.contains("software")) {
            trendScore += 2;
        }

        // กลุ่มเล่นรอบ Cyclical — CAT, AA, CVX, X
        // ★ ใช้ +3 เพื่อชนะ stableScore +2 จาก Market Cap ใหญ่ (เช่น CAT ~180B)
        else if (ind.contains("machin") || ind.contains("manufactur") ||
                ind.contains("industrial") || ind.contains("construct") ||
                ind.contains("aluminum") || ind.contains("steel") ||
                ind.contains("mining") || ind.contains("metal") ||
                ind.contains("chemical") || ind.contains("material") ||
                ind.contains("oil") || ind.contains("energy") ||
                ind.contains("commodity") || ind.contains("agricultur")) {
            swingScore += 3;
        }

        // กลุ่ม Airlines — ★ ขาดทุน (AAL-style) = เก็งกำไร | มีกำไร = เล่นรอบ
        // +4 เพราะต้องชนะ swing ที่สะสมจาก Beta+Cap
        else if (ind.contains("airline") || ind.contains("air transport")) {
            if (peValue < 0)
                speculativeScore += 4;
            else
                swingScore += 2;
        }

        // กลุ่ม Aerospace/Space/Defense — Startup อวกาศ vs. Defense ยักษ์
        else if (ind.contains("aerospace") || ind.contains("space") ||
                ind.contains("defense") || ind.contains("military")) {
            if (capBillion < 10.0)
                speculativeScore += 2; // RKLB = Startup อวกาศ
            else
                swingScore += 1; // LMT, RTX = Defense ใหญ่
        }

        // กลุ่มเล่นรอบ — Banking / Financial
        // ★ +3 เพื่อชนะ stableScore ที่ JPM สะสมมาจาก Cap > 100B
        else if (ind.contains("bank") || ind.contains("insurance") ||
                ind.contains("financial services") || ind.contains("asset management") ||
                ind.contains("investment bank") || ind.contains("diversified financial")) {
            swingScore += 3;
        }

        // กลุ่มเล่นรอบ — Consumer Discretionary (DIS, NKE, Retail, Auto)
        else if (ind.contains("retail") || ind.contains("apparel") ||
                ind.contains("footwear") || ind.contains("sport") ||
                ind.contains("entertainment") || ind.contains("media") ||
                ind.contains("streaming") || ind.contains("auto") ||
                ind.contains("leisure") || ind.contains("transportation") ||
                ind.contains("shipping")) {
            swingScore += 2;
        }

        // กลุ่มเก็งกำไร — Crypto Native / Biotech (MARA จะโดนทางนี้)
        else if (ind.contains("crypto") || ind.contains("bitcoin") ||
                ind.contains("blockchain") || ind.contains("biotech") ||
                ind.contains("cannabis") || ind.contains("spac")) {
            speculativeScore += 3;
        }

        // ════════════════════════════════════════════════════════════════
        // 6. PRICE POSITION — ตำแหน่งราคาในช่วง 52 สัปดาห์
        // ════════════════════════════════════════════════════════════════
        if (pricePosition > 0.85)
            trendScore += 1; // Near 52W High = Trending
        else if (pricePosition < 0.15)
            speculativeScore += 1; // Near 52W Low = Risk/Speculative
        else if (pricePosition >= 0.35 && pricePosition <= 0.65)
            swingScore += 1; // Mid-range = Swing

        // ════════════════════════════════════════════════════════════════
        // 7. สรุปผล — เลือกกลุ่มที่คะแนนสูงสุด
        // ★ เพิ่ม Swing Score เป็นตัวแปรอิสระ (ไม่ใช้แค่ fallback)
        // ════════════════════════════════════════════════════════════════
        int maxScore = Math.max(Math.max(stableScore, trendScore),
                Math.max(swingScore, speculativeScore));

        log.debug("📊 [{}] Stable={} Trend={} Swing={} Speculative={} | Beta={} Cap={}B Vol={} PE={} Ind={}",
                "?", stableScore, trendScore, swingScore, speculativeScore,
                absBeta, String.format("%.1f", capBillion), vol, peValue, ind);

        // ต้องมีคะแนนขั้นต่ำ 3 เพื่อป้องกัน noise
        if (maxScore < 3)
            return "เล่นรอบ (Swing)";

        if (speculativeScore == maxScore)
            return "เก็งกำไร (Speculative)";
        if (trendScore == maxScore)
            return "กระแส (Trending)";
        if (stableScore == maxScore)
            return "มั่นคง (Stable)";

        return "เล่นรอบ (Swing)";
    }

    @Cacheable(value = "stockInfo", key = "#symbol", unless = "#result == null")
    public StockInfoDatabaseDTO getStockInfo(String symbol) {
        String cleanSymbol = symbol.trim().toUpperCase();

        // 1. ค้นหาใน Database ก่อน (ถ้าเป็น 12 ตัวหลัก จะเจอตรงนี้และส่งกลับเลย)
        Optional<StockAsset> dbStockOpt = stockAssetRepository.findById(cleanSymbol);
        if (dbStockOpt.isPresent()) {
            StockAsset dbStock = dbStockOpt.get();
            log.info("🔍 พบหุ้น {} ใน Database", cleanSymbol);
            return new StockInfoDatabaseDTO(
                    dbStock.getSymbol(), dbStock.getName(), dbStock.getBeta(),
                    dbStock.getMarketCap(), dbStock.getAvgVolume(), dbStock.getCategory(), dbStock.getIndustry());
        }

        // 2. ถ้าไม่เจอใน DB -> เริ่มกระบวนการ "คำนวณสด (On-the-fly)"
        log.info("🌐 ไม่พบ {} ใน Database กำลังดึงข้อมูลสดจาก FMP API...", cleanSymbol);
        try {
            RestTemplate restTemplate = new RestTemplate();
            String apiKey = apiKeystock; // มั่นใจว่าเปลี่ยนเป็น Finnhub Key ใน .env แล้ว

            String quoteUrl = "https://finnhub.io/api/v1/quote?symbol=" + cleanSymbol + "&token=" + apiKey;
            FinnhubStockDTO quote = restTemplate.getForObject(quoteUrl, FinnhubStockDTO.class);

            // 🌟 B. ดึง Market Cap, Beta สถิติ (Metric)
            String metricUrl = "https://finnhub.io/api/v1/stock/metric?symbol=" + cleanSymbol + "&metric=all&token="
                    + apiKey;
            FinnhubFinancials financials = restTemplate.getForObject(metricUrl, FinnhubFinancials.class);

            // 🔥 C. ดึง Profile (Industry & Name) -> เพิ่มตรงนี้
            String profileUrl = "https://finnhub.io/api/v1/stock/profile2?symbol=" + cleanSymbol + "&token=" + apiKey;
            FinnhubProfileDTO profile = restTemplate.getForObject(profileUrl, FinnhubProfileDTO.class);

            if (quote == null || financials == null || financials.getMetric() == null) {
                log.warn("❌ ไม่พบข้อมูลหุ้น {} ใน Finnhub", cleanSymbol);
                return null;
            }

            FinnhubFinancials.Metric m = financials.getMetric();

            // 🌟 3. เตรียมข้อมูลสำหรับสูตรคำนวณ
            // Finnhub ให้ MarketCap เป็นหน่วยล้าน (Millions) ต้องคูณ 1,000,000
            // เพื่อให้เป็นหน่วยเต็ม
            BigDecimal marketCapFull = (m.getMarketCap() != null) ? m.getMarketCap().multiply(new BigDecimal("1000000"))
                    : BigDecimal.ZERO;
            String industry = (profile != null && profile.getIndustry() != null) ? profile.getIndustry() : "Unknown";
            String fullName = (profile != null && profile.getName() != null) ? profile.getName() : cleanSymbol;
            // ดึงค่า High/Low รอบปีจาก Metric (ไม่ใช่จาก Quote)
            BigDecimal yearHigh = m.getYearHigh();
            BigDecimal yearLow = m.getYearLow();
            BigDecimal currentPrice = quote.getCurrentPrice();
            Long volumeLong = 0L;
            if (m.getAvgVolume10Day() != null && m.getAvgVolume10Day().compareTo(BigDecimal.ZERO) > 0) {
                // 🌟 หัวใจสำคัญ: คูณ 1,000,000 เพราะ Finnhub ส่งค่าเฉลี่ยมาเป็นหน่วย "ล้าน"
                volumeLong = m.getAvgVolume10Day().multiply(new BigDecimal("1000000")).longValue();
            }
            // 🥈 อันดับ 2: ถ้าไม่มี 10-Day ให้ลองดู Volume รวมใน Metric (v)
            else if (m.getVolume() != null && m.getVolume().compareTo(BigDecimal.ZERO) > 0) {
                // ถ้ามี v ใน metric ปกติจะเป็นหน่วยล้านเหมือนกัน
                volumeLong = m.getVolume().multiply(new BigDecimal("1000000")).longValue();
            }
            // 🥉 อันดับ 3: ถ้าไม่มีจริงๆ ถึงจะไปเอาจาก Quote (v) ของวันนี้
            else if (quote.getVolume() != null) {
                // 💡 วอลลุ่มจาก Quote มักเป็นหน่วย "หุ้นจริง" ไม่ต้องคูณล้าน
                volumeLong = quote.getVolume().longValue();
            }

            // ⚠️ พิเศษ: ถ้าทุกอย่างยังเป็น 0 หรือน้อยผิดปกติ (เช่น ได้ 30)
            // ให้เช็คว่า Market Cap มีค่าไหม ถ้ามีค่าแต่ Volume น้อย อาจเป็นเพราะตลาดปิด
            if (volumeLong < 100 && m.getMarketCap() != null) {
                log.warn("⚠️ พบวอลลุ่มผิดปกติ ({}) สำหรับหุ้น {}", volumeLong, cleanSymbol);
            }
            BigDecimal pe = m.getPe();

            // ใช้ค่า beta
            BigDecimal finalBeta = m.getBeta();
            // 4. รันสูตร estimateBeta (ของคุณ) และจัดกลุ่ม
            // ถ้า API ไม่ให้ Beta มา (เป็น Null หรือเป็น 0) ถึงจะใช้ "สูตรสำรอง" ของเรา
            if (finalBeta == null || finalBeta.compareTo(BigDecimal.ZERO) == 0) {
                log.info("⚠️ ไม่พบค่า Beta ของจริงสำหรับ {} กำลังใช้ระบบ EstimateBeta", cleanSymbol);
                finalBeta = estimateBeta(marketCapFull, volumeLong, pe, yearHigh, yearLow, currentPrice);
            }

            String category = calculateCategory(finalBeta, marketCapFull, volumeLong, pe, industry, yearHigh, yearLow,
                    currentPrice);

            log.info("✅ คำนวณสำเร็จ: {} กลุ่ม: {}", cleanSymbol, category);

            return new StockInfoDatabaseDTO(
                    cleanSymbol,
                    fullName,
                    finalBeta,
                    marketCapFull.longValue(),
                    volumeLong,
                    category,
                    industry);

        } catch (Exception e) {
            log.error("❌ Finnhub Error สำหรับ {}: {}", cleanSymbol, e.getMessage());
            return null;
        }
    }

    // รวมปัจจัย Market Cap, P/E Ratio และ 52-Week Price Volatility

    private BigDecimal estimateBeta(BigDecimal marketCap, Long volume, BigDecimal pe,
            BigDecimal yearHigh, BigDecimal yearLow, BigDecimal price) {

        // 1. จัดการค่าเบื้องต้น
        double capBillion = (marketCap != null) ? marketCap.doubleValue() / 1_000_000_000.0 : 0.0;
        double peValue = (pe != null) ? pe.doubleValue() : -1.0;

        // 🌟 2. คำนวณความสวิงของราคา (Historical Price Volatility) แบบสากล
        double priceSpread = 0.0;
        if (yearHigh != null && yearLow != null && yearHigh.doubleValue() > 0) {
            double high = yearHigh.doubleValue();
            double low = yearLow.doubleValue();
            double midPoint = (high + low) / 2.0; // ใช้ค่ากึ่งกลางเพื่อลด Bias ของราคาปัจจุบัน

            if (midPoint > 0) {
                priceSpread = (high - low) / midPoint;
                // ตัวอย่าง: High 150, Low 50 -> Spread = 100 / 100 = 1.0 (สวิง 100%)
            }
        }

        // 🎯 3. Rule Engine (อิงตามหลักพฤติกรรมราคาและปัจจัยพื้นฐาน)

        // กฎข้อ 1: หุ้นซอมบี้ / หุ้นปั่นจัดๆ (Extreme Speculation)
        // ขาดทุน (P/E ติดลบ) และ ราคาแกว่งรอบปีเกิน 80% (Spread > 0.8)
        if (peValue < 0 && priceSpread > 0.8) {
            return new BigDecimal("2.20");
        }

        // กฎข้อ 2: หุ้นเติบโตสูง / หุ้น Tech ยักษ์ใหญ่ (High-Growth / Big Tech)
        // บริษัทใหญ่ (> 50B) แต่คนคาดหวังสูงปรี๊ด (P/E > 40) หรือราคาสวิงแรง (> 50%)
        if (capBillion > 50.0 && (peValue > 40.0 || priceSpread > 0.5)) {
            return new BigDecimal("1.60"); // Beta ระดับ TSLA, NVDA
        }

        // กฎข้อ 3: หุ้นจิ๋วแต่ซิ่ง (Small-Cap Volatile)
        // บริษัทเล็ก (< 5B) และราคาสวิงเกิน 60%
        if (capBillion > 0 && capBillion < 5.0 && priceSpread > 0.6) {
            return new BigDecimal("1.80");
        }

        // กฎข้อ 4: หุ้นคุณค่า / หุ้นมั่นคง (Value / Defensive)
        // บริษัทใหญ่ (> 50B), มีกำไรสมเหตุสมผล (P/E 5-25) และราคานิ่ง (สวิงไม่เกิน 30%)
        if (capBillion > 50.0 && peValue > 0 && peValue <= 25.0 && priceSpread < 0.3) {
            return new BigDecimal("0.85"); // Beta ระดับ JNJ, KO, BRK.B
        }

        // กฎข้อ 5: หุ้นสภาพคล่องสูงปรี๊ด / หุ้นในกระแส (High Liquidity)
        // วอลลุ่มเฉลี่ยเกิน 20 ล้านหุ้น (แสดงว่ามีคนรุมเทรดเยอะ
        // มักจะสวิงกว่าตลาดนิดหน่อย)
        if (volume != null && volume > 20_000_000) {
            return new BigDecimal("1.30");
        }

        // ค่า Default: ตลาดโดยรวม (Market Average)
        return new BigDecimal("1.00");
    }

    public List<String> getRecommendedStocks(String traderType) {
        String category = "เล่นรอบ (Swing)"; // fallback
        if (traderType != null) {
            String lowerType = traderType.toLowerCase().trim();
            if (lowerType.contains("scalper"))
                category = "เก็งกำไร (Speculative)";
            else if (lowerType.contains("day trader"))
                category = "กระแส (Trending)";
            else if (lowerType.contains("position trader"))
                category = "มั่นคง (Stable)";
            else if (lowerType.contains("swing trader"))
                category = "เล่นรอบ (Swing)";
        }

        List<StockAsset> assets = stockAssetRepository.findByCategory(category);
        List<String> symbols = new ArrayList<>();
        if (assets != null) {
            for (StockAsset asset : assets) {
                if (asset.isTradable()) {
                    symbols.add(asset.getSymbol());
                }
            }
        }

        // Add fallbacks just in case the DB is missing some stocks
        if (symbols.isEmpty()) {
            if (category.contains("เก็งกำไร"))
                symbols.addAll(Arrays.asList("MSTR", "COIN", "MARA", "RIOT", "HUT"));
            else if (category.contains("กระแส"))
                symbols.addAll(Arrays.asList("NVDA", "TSLA", "NFLX", "AMD", "PLTR"));
            else if (category.contains("มั่นคง"))
                symbols.addAll(Arrays.asList("KO", "WMT", "LLY", "JNJ", "PG"));
            else
                symbols.addAll(Arrays.asList("JPM", "DIS", "NKE", "BA", "SBUX"));
        }

        Collections.shuffle(symbols);
        int numToPick = Math.min(symbols.size(), 5);
        return symbols.subList(0, numToPick);
    }

    private StockInfoDatabaseDTO fetchStockDataFromApi(String cleanSymbol) {
        RestTemplate restTemplate = new RestTemplate();
        String apiKey = apiKeystock;

        try {
            String quoteUrl = "https://finnhub.io/api/v1/quote?symbol=" + cleanSymbol + "&token=" + apiKey;
            FinnhubStockDTO quote = restTemplate.getForObject(quoteUrl, FinnhubStockDTO.class);

            String metricUrl = "https://finnhub.io/api/v1/stock/metric?symbol=" + cleanSymbol + "&metric=all&token="
                    + apiKey;
            FinnhubFinancials financials = restTemplate.getForObject(metricUrl, FinnhubFinancials.class);

            String profileUrl = "https://finnhub.io/api/v1/stock/profile2?symbol=" + cleanSymbol + "&token=" + apiKey;
            FinnhubProfileDTO profile = restTemplate.getForObject(profileUrl, FinnhubProfileDTO.class);

            if (quote == null || financials == null || financials.getMetric() == null) {
                return null; // หาหุ้นไม่เจอ
            }

            FinnhubFinancials.Metric m = financials.getMetric();
            String industry = (profile != null && profile.getIndustry() != null) ? profile.getIndustry() : "Unknown";
            String fullName = (profile != null && profile.getName() != null) ? profile.getName() : cleanSymbol;

            BigDecimal marketCapFull = (m.getMarketCap() != null) ? m.getMarketCap().multiply(new BigDecimal("1000000"))
                    : BigDecimal.ZERO;
            BigDecimal yearHigh = m.getYearHigh();
            BigDecimal yearLow = m.getYearLow();
            BigDecimal currentPrice = quote.getCurrentPrice();

            Long volumeLong = 0L;
            if (m.getAvgVolume10Day() != null && m.getAvgVolume10Day().compareTo(BigDecimal.ZERO) > 0) {
                volumeLong = m.getAvgVolume10Day().multiply(new BigDecimal("1000000")).longValue();
            } else if (m.getVolume() != null && m.getVolume().compareTo(BigDecimal.ZERO) > 0) {
                volumeLong = m.getVolume().multiply(new BigDecimal("1000000")).longValue();
            } else if (quote.getVolume() != null) {
                volumeLong = quote.getVolume().longValue();
            }

            BigDecimal pe = m.getPe();
            BigDecimal finalBeta = m.getBeta();

            if (finalBeta == null || finalBeta.compareTo(BigDecimal.ZERO) == 0) {
                finalBeta = estimateBeta(marketCapFull, volumeLong, pe, yearHigh, yearLow, currentPrice);
            }

            // คำนวณจัดกลุ่ม
            String category = calculateCategory(finalBeta, marketCapFull, volumeLong, pe, industry, yearHigh, yearLow,
                    currentPrice);

            // ส่งคืนเป็นก้อน DTO ทันที ไม่ต้องเรียก stockAssetRepository.save()
            return new StockInfoDatabaseDTO(
                    cleanSymbol, fullName, finalBeta, marketCapFull.longValue(), volumeLong, category, industry);

        } catch (Exception e) {
            log.error("❌ API Error สำหรับ {}: {}", cleanSymbol, e.getMessage());
            return null;
        }
    }
}
