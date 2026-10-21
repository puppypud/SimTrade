package com.alpaca.web.Service;

import com.alpaca.web.Repository.StockAssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.PathResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Service
public class StockImportService {
    private static final Logger log = LoggerFactory.getLogger(StockImportService.class);
    private final StockAnalysisService stockAnalysisService;
    private final StockAssetRepository stockAssetRepository;

    // Inject Service และ Repository ที่ต้องใช้
    public StockImportService(StockAnalysisService stockAnalysisService, StockAssetRepository stockAssetRepository) {
        this.stockAnalysisService = stockAnalysisService;
        this.stockAssetRepository = stockAssetRepository;
    }

    private List<String> loadSymbolsFormCsv(){
        List<String> symbols = new ArrayList<>();
        try{
            ClassPathResource resource = new ClassPathResource("sp500_symbols.csv");
            BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream()));
            String line;
            boolean isFirstLine = true ;
            while ((line = reader.readLine()) != null){
                if (isFirstLine) {
                    isFirstLine = false;
                    continue; // ข้ามไปอ่านบรรทัดต่อไปทันที
                }
                String[] columns = line.split(",");

                // 3. ตรวจสอบว่ามีข้อมูล และดึงเฉพาะคอลัมน์แรก (Index 0 คือ Symbol)
                if (columns.length > 0) {
                    String symbol = columns[0].trim().toUpperCase();

                    // ป้องกันค่าว่าง (เช่น บรรทัดเปล่าท้ายไฟล์)
                    if (!symbol.isEmpty()) {
                        symbols.add(symbol);
                    }
                }
            }
            reader.close();
            log.info("อ่านไฟล์ CSV สำเร็จ พบรายชื่อหุ้นทั้งหมด: {} ตัว", symbols.size());
        }catch (Exception e){
            log.error("❌ ไม่สามารถอ่านไฟล์ sp500_symbols.csv ได้: {}", e.getMessage());
        }
        return symbols;
    }

    // 2. ฟังก์ชันหลักสำหรับดึง API และบันทึกลง Database
    @Async // ต้องมี @Async เพื่อให้รันเป็น Background Task เว็บจะได้ไม่ค้าง
    public void importStocksToDatabase() {
        log.info("🚀 เริ่มต้นนำเข้าหุ้นจาก CSV ไปคำนวณและบันทึกลง Database...");

        List<String> symbolsToImport = loadSymbolsFormCsv();

        int successCount = 0;
        int count = 0;

        for (String symbol : symbolsToImport) {
            count++;

            // ตรวจสอบก่อนว่า Database มีหุ้นตัวนี้อยู่แล้วหรือยัง จะได้ไม่เปลือง API
            if (stockAssetRepository.existsById(symbol)) {
                log.info("[{}/{}] ⏭️ ข้ามหุ้น {}: มีข้อมูลใน Database แล้ว", count, symbolsToImport.size(), symbol);
                continue;
            }

            try {
                log.info("[{}/{}] ⏳ กำลังคำนวณและบันทึกหุ้น: {}", count, symbolsToImport.size(), symbol);

                // 👉 ส่งชื่อหุ้นไปให้ Service อีกตัวทำหน้าที่ยิง API, คำนวณ และ Save
                stockAnalysisService.fetchAndSaveStock(symbol);

                successCount++;

                // 🚨 สำคัญที่สุด: Finnhub ให้ยิงฟรี 60 ครั้ง/นาที ต้องหน่วงเวลา 3.5 วินาทีเสมอ
                Thread.sleep(3500);

            } catch (Exception e) {
                log.error("❌ ข้อผิดพลาดที่หุ้น {}: {}", symbol, e.getMessage());
            }
        }
        log.info("🎉 นำเข้าสำเร็จทั้งหมด: {} ตัว", successCount);
    }
}
