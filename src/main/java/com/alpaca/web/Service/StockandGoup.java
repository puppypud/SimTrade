package com.alpaca.web.Service;
import com.alpaca.web.Repository.StockAssetRepository;
import com.alpaca.web.dto.StockInfoDTO;
import com.alpaca.web.entity.StockAsset;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import yahoofinance.Stock;
import yahoofinance.YahooFinance;

@Service
public class StockandGoup {

private final StockAssetRepository stockAssetRepository;
    private static final Logger log = LoggerFactory.getLogger(StockandGoup.class);

    public StockandGoup(StockAssetRepository stockAssetRepository) {
        this.stockAssetRepository = stockAssetRepository;
    }

    private StockAsset createStock(String symbol, String name, String assetClass, String betaStr, Long marketCap, Long avgVol, String category) {
        StockAsset s = new StockAsset();
        s.setSymbol(symbol);
        s.setName(name);
        s.setAssetClass(assetClass);
        s.setBeta(new BigDecimal(betaStr));
        s.setMarketCap(marketCap);
        s.setAvgVolume(avgVol);
        s.setCategory(category);
        s.setTradable(true);
        return s;
    }

    @PostConstruct
    public void seedData() {
        // เช็คก่อนว่ามีข้อมูลใน Database หรือยัง ถ้ายังว่าง ให้จัดการเพิ่มเข้าไป
        if (stockAssetRepository.count() == 0) {
            log.info("📌 StockAsset Table is empty. Initializing curated 15 stocks...");


            List<StockAsset> curatedStocks = Arrays.asList(
                    // 1. กลุ่มมั่นคง (Stable / Blue-chip) -> Beta ต่ำ, Market Cap สูงลิ่ว
                    createStock("AAPL", "Apple Inc.", "US_EQUITY", "1.05", 2800000000000L, 50000000L, "มั่นคง (Stable)"),
                    createStock("MSFT", "Microsoft Corp.", "US_EQUITY", "0.95", 3000000000000L, 25000000L, "มั่นคง (Stable)"),
                    createStock("JNJ", "Johnson & Johnson", "US_EQUITY", "0.55", 380000000000L, 8000000L, "มั่นคง (Stable)"),

                    // 2. กลุ่มเล่นรอบ (Swing) -> Beta กลางๆ แกว่งตัวเป็นรอบชัดเจน
                    createStock("TSLA", "Tesla Inc.", "US_EQUITY", "2.10", 600000000000L, 110000000L, "เล่นรอบ (Swing)"),
                    createStock("META", "Meta Platforms", "US_EQUITY", "1.20", 1200000000000L, 18000000L, "เล่นรอบ (Swing)"),
                    createStock("AMD", "Advanced Micro Devices", "US_EQUITY", "1.60", 280000000000L, 50000000L, "เล่นรอบ (Swing)"),

                    // 3. กลุ่มกระแส (Trending) -> Volume สูงผิดปกติในช่วงนี้ หรือเป็นกลุ่มเหรียญกระแสหลัก
                    createStock("NVDA", "NVIDIA Corp.", "US_EQUITY", "1.70", 2200000000000L, 60000000L, "กระแส (Trending)"),
                    createStock("SMCI", "Super Micro Computer", "US_EQUITY", "2.50", 50000000000L, 15000000L, "กระแส (Trending)"),
                    createStock("BTC/USD", "Bitcoin", "CRYPTO", "1.00", 1300000000000L, 35000000000L, "กระแส (Trending)"),

                    // 4. กลุ่มเก็งกำไร (Speculative) -> Beta สูงปรี๊ด Market Cap ต่ำ หรือเป็นเหรียญซิ่ง
                    createStock("GME", "GameStop Corp.", "US_EQUITY", "2.80", 4000000000L, 12000000L, "เก็งกำไร (Speculative)"),
                    createStock("AMC", "AMC Entertainment", "US_EQUITY", "3.10", 1500000000L, 25000000L, "เก็งกำไร (Speculative)"),
                    createStock("DOGE/USD", "Dogecoin", "CRYPTO", "2.50", 20000000000L, 1500000000L, "เก็งกำไร (Speculative)")
            );

            stockAssetRepository.saveAll(curatedStocks);
            log.info("✅ Successfully loaded 15 curated stocks into Database!");
        }
    }

    /**
     * ฟังก์ชันจัดกลุ่มหุ้น 4 ประเภท ตามหลักการทางการเงิน
     * @param beta ค่าความผันผวน (เทียบกับตลาดคือ 1.0)
     * @param marketCap มูลค่าตามราคาตลาด (หน่วยดอลลาร์)
     * @param volume ปริมาณการซื้อขายล่าสุด/เฉลี่ย
     * @return String ชื่อกลุ่ม
     */

    public String calculateCategory(BigDecimal beta, BigDecimal marketCap, Long volume) {

        // กันเหนียวกรณี API ส่งค่า Null กลับมา (ใส่ค่า Default ที่เป็นกลางที่สุด)
        if (beta == null) beta = BigDecimal.ONE;
        if (marketCap == null) marketCap = BigDecimal.ZERO;
        if (volume == null) volume = 0L;

        double betaValue = beta.doubleValue();
        // แปลง Market Cap เป็นหน่วย พันล้านเหรียญ (Billion) เพื่อให้อ่าน/เขียน If ง่ายขึ้น
        double marketCapBillion = marketCap.doubleValue() / 1_000_000_000.0;


        // 1. กลุ่มมั่นคง (Stable): บริษัทใหญ่มาก (เกิน 50 พันล้าน) และผันผวนน้อยกว่าหรือเท่ากับตลาด (Beta < 1.1)
        if (marketCapBillion >= 50.0 && betaValue <= 1.1) {
            return "มั่นคง (Stable)";
        }

        // 2. กลุ่มเก็งกำไร (Speculative): บริษัทขนาดกลาง-เล็ก (ต่ำกว่า 5 พันล้าน) หรือ ค่า Beta สูงปรี๊ด (ผันผวนแรงกว่าตลาดเกิน 1.6 เท่า)
        if (marketCapBillion < 5.0 || betaValue > 1.6) {
            return "เก็งกำไร (Speculative)";
        }

        // 3. กลุ่มกระแส (Trending): วอลุ่มเทรดมหาศาล (เกิน 20 ล้านหุ้นต่อวัน) และมีความสวิงในระดับสูง (Beta 1.2 ขึ้นไป)
        if (volume > 20_000_000 && betaValue >= 1.2) {
            return "กระแส (Trending)";
        }

        // 4. กลุ่มเล่นรอบ (Swing): หุ้นที่หลุดจากเงื่อนไข 3 ข้อด้านบน (ขนาดกลางๆ Beta 1.1 - 1.5)
        return "เล่นรอบ (Swing)";
    }

    public StockInfoDTO getStockInfo(String symbol) {
        String cleanSymbol = symbol.trim().toUpperCase();

        // 1. ค้นหาใน Database ก่อน (กลุ่ม 12 ตัวแรกที่คุณเซ็ตไว้)
        Optional<StockAsset> dbStockOpt = stockAssetRepository.findById(cleanSymbol);

        if (dbStockOpt.isPresent()) {
            StockAsset dbStock = dbStockOpt.get();
            log.info("🔍 พบหุ้น {} ในระบบ Database ส่งข้อมูลกลับทันที", cleanSymbol);

            // คืนค่าข้อมูลที่ Admin จัดกลุ่มไว้แล้ว
            return new StockInfoDTO(
                    dbStock.getSymbol(),
                    dbStock.getName(),
                    dbStock.getBeta(),
                    dbStock.getMarketCap(),
                    dbStock.getAvgVolume(),
                    dbStock.getCategory()
            );
        }

        // 2. ถ้าไม่เจอใน DB -> เริ่มกระบวนการ "คำนวณสด (On-the-fly)"
        log.info("🌐 ไม่พบ {} ใน Database กำลังดึงข้อมูลสดจาก Yahoo Finance...", cleanSymbol);
        try {
            // (ต้องแน่ใจว่าติดตั้ง Library YahooFinanceAPI ใน build.gradle แล้ว)
            yahoofinance.Stock yStock = yahoofinance.YahooFinance.get(cleanSymbol);

            if (yStock == null || yStock.getName() == null) {
                log.warn("❌ ค้นหาหุ้น {} ไม่พบทั้งในระบบและ Yahoo Finance", cleanSymbol);
                return null;
            }

            // ดึงค่า Fundamental จาก API

            BigDecimal marketCap = yStock.getStats().getMarketCap();
            Long volume = yStock.getQuote().getVolume();
            BigDecimal pe = yStock.getStats().getPe();
            BigDecimal yearHigh = yStock.getQuote().getYearHigh();
            BigDecimal yearLow = yStock.getQuote().getYearLow();
            BigDecimal price = yStock.getQuote().getPrice();
            BigDecimal beta = estimateBeta(marketCap, volume, pe, yearHigh, yearLow, price);


            marketCap = (marketCap != null) ? marketCap : BigDecimal.ZERO;
            volume = (volume != null) ? volume : 0L;

            // 🌟 3. โยนข้อมูลดิบเข้าฟังก์ชันจัดกลุ่มของคุณ (Rule Engine)
            String dynamicCategory = calculateCategory(beta, marketCap, volume);

            log.info("✅ คำนวณสดสำเร็จ {} ถูกจัดให้อยู่ในกลุ่ม: {}", cleanSymbol, dynamicCategory);

            // 4. ส่งข้อมูลกลับไปให้หน้าเว็บ (สังเกตว่าเรา return เลย ไม่ได้สั่ง stockAssetRepository.save)
            return new StockInfoDTO(
                    cleanSymbol,
                    yStock.getName(),
                    beta,
                    marketCap.longValue(),
                    volume,
                    dynamicCategory
            );

        } catch (Exception e) {
            log.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูลสดของหุ้น: {}", cleanSymbol, e);
            return null;
        }
    }

    //รวมปัจจัย Market Cap, P/E Ratio และ 52-Week Price Volatility

    private BigDecimal estimateBeta(BigDecimal marketCap, Long volume, BigDecimal pe,
                                    BigDecimal yearHigh, BigDecimal yearLow, BigDecimal price) {

        // 1. จัดการค่าเบื้องต้น
        double capBillion = (marketCap != null) ? marketCap.doubleValue() / 1_000_000_000.0 : 0.0;
        double peValue = (pe != null) ? pe.doubleValue() : -1.0; // ถ้า P/E ไม่มี มักจะหมายถึงบริษัทขาดทุน (ผันผวนสูง)

        // 2. คำนวณความสวิงของราคาย้อนหลัง 1 ปี (Price Spread)
        double priceSpread = 0.0;
        if (yearHigh != null && yearLow != null && price != null && price.doubleValue() > 0) {
            // สูตร: (จุดสูงสุด - จุดต่ำสุด) / ราคาปัจจุบัน -> ถ้ายิ่งกว้าง แปลว่ายิ่งสวิงแรง
            priceSpread = (yearHigh.doubleValue() - yearLow.doubleValue()) / price.doubleValue();
        }

        // 🎯 3. Rule Engine แบบแม่นยำสูง

        // กฎข้อที่ 1: แก้บั๊กหุ้น Tech ยักษ์ใหญ่ (เช่น TSLA, NVDA)
        // บริษัทใหญ่มาก แต่ P/E สูงปรี๊ด หรือ ราคาแกว่งรอบปีเกิน 60%
        if (capBillion > 50.0 && (peValue > 40.0 || priceSpread > 0.6)) {
            return new BigDecimal("1.70"); // บังคับให้เป็นกลุ่มกระแส/เล่นรอบ
        }

        // กฎข้อที่ 2: หุ้นมั่นคงของจริง (เช่น JNJ, BRK.B, Coca-Cola)
        // บริษัทใหญ่, ทำกำไรสม่ำเสมอ (P/E 10-25) และ ราคาไม่ค่อยแกว่ง (น้อยกว่า 30%)
        if (capBillion > 50.0 && peValue > 0 && peValue <= 25.0 && priceSpread < 0.3) {
            return new BigDecimal("0.85"); // บังคับให้ตกกลุ่ม "มั่นคง"
        }

        // กฎข้อที่ 3: หุ้นปั่น / หุ้นกำลังจะเจ๊ง (Penny Stocks / Zombie)
        // บริษัทขาดทุน (P/E ติดลบ) หรือราคาแกว่งหน้ามืดเกิน 100% (ราคาพุ่ง/ร่วงเกิน 1 เท่าตัว)
        if (peValue < 0 || priceSpread > 1.0) {
            return new BigDecimal("2.20"); // บังคับให้ตกกลุ่ม "เก็งกำไร"
        }

        // กฎข้อที่ 4: หุ้นกระแส (Trending)
        if (volume != null && volume > 20_000_000) {
            return new BigDecimal("1.40");
        }

        // ค่า Default สำหรับหุ้นกลางๆ ทั่วไป
        return new BigDecimal("1.10");
    }
}
