package com.alpaca.web.Service;

import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.Repository.AnalysisDataRepository;
import com.alpaca.web.corsconfig.RiskConfig;
import com.alpaca.web.dto.BehaviorAlertDTO;

import com.alpaca.web.entity.AnalysisData;
import com.alpaca.web.entity.UserAccount;
import com.alpaca.web.enums.TraderType;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class BehavioralAnalyticsService {
    private final SimpMessagingTemplate messagingTemplate;
    private final AnalysisDataRepository analysisDataRepository; // 🚀 เพิ่ม Repo
    private final AccountRepository accountRepository;   // 🚀 เพิ่ม Repo
    private final Cache<String, AtomicInteger> orderFrequencyCache;

    public BehavioralAnalyticsService(SimpMessagingTemplate messagingTemplate,
                                      AnalysisDataRepository analysisDataRepository,
                                      AccountRepository accountRepository) {
        this.messagingTemplate = messagingTemplate;
        this.analysisDataRepository = analysisDataRepository;
        this.accountRepository = accountRepository;

        this.orderFrequencyCache = Caffeine.newBuilder()
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .build();
    }

    // 🚀 เพิ่ม Annotation นี้เพื่อให้มั่นใจว่าข้อมูลเซฟลง DB สำเร็จแน่ๆ
    @Transactional
    public void evaluateOrderEvent(Long userId, String symbol, String side, double currentProfitPercent, double priceChangePercent, double volumeSoldPercent, TraderType traderType) {
        RiskConfig config = RiskConfig.getConfig(traderType);

        // ดึง UserAccount เพื่อเอาไปเซฟลง DB (ป้องกัน Error Foreign Key)
        UserAccount user = accountRepository.findById(userId).orElseThrow();

        // -----------------------------------------------------
        // Rule 1: FOMO (ฝั่งซื้อ)
        // -----------------------------------------------------
        if (side.equalsIgnoreCase("buy")) {
            String cacheKey = userId + "-buy";
            AtomicInteger orderCount = orderFrequencyCache.get(cacheKey, k -> new AtomicInteger(0));
            int currentCount = orderCount.incrementAndGet();

            if (currentCount >= config.fomoMaxOrders && priceChangePercent >= config.fomoPriceSurgePercent) {
                String message = "คุณมีพฤติกรรมเคาะขวาซื้อรัวๆ " + currentCount + " ครั้ง ขณะราคากำลังพุ่งสูง";

                // 1. บันทึกลง Database
                saveToDatabase(user, symbol, "FOMO_ALERT", message, "WARNING", priceChangePercent, null, null);

                // 2. สร้าง DTO และยิง WebSocket ไปหน้าบ้าน
                sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("FOMO_ALERT", "พฤติกรรม: กลัวตกรถ (FOMO)", message, "WARNING"));

                orderFrequencyCache.invalidate(cacheKey);
            }
        }

        // -----------------------------------------------------
        // ฝั่งขาย (Rule 2: Sell Early, Rule 3: Panic Sell)
        // -----------------------------------------------------
        if (side.equalsIgnoreCase("sell")) {

            // Rule 2: Selling Winners Too Early
            if (currentProfitPercent > 0 && currentProfitPercent <= config.sellingTooEarlyTriggerPercent &&
                    config.takeProfitExpectedPercent > currentProfitPercent * 2) {
                String message = "คุณมีพฤติกรรมรีบขายทำกำไรเร็วเกินไป (เป้าหมาย +" + config.takeProfitExpectedPercent + "% แต่ขายที่ +" + currentProfitPercent + "%)";

                saveToDatabase(user, symbol, "SELL_EARLY_ALERT", message, "INFO", null, currentProfitPercent, null);
                sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("SELL_EARLY_ALERT", "พฤติกรรม: รีบขายหมู", message, "INFO"));
            }

            // Rule 3: Panic Sell
            if (priceChangePercent <= config.panicSellPriceDropPercent && volumeSoldPercent >= config.panicSellVolumePercent) {
                String message = "คุณมีพฤติกรรมตื่นตระหนกเทขายหุ้น " + volumeSoldPercent + "% เมื่อราคาร่วงลง " + priceChangePercent + "%";

                saveToDatabase(user, symbol, "PANIC_SELL_ALERT", message, "DANGER", priceChangePercent, currentProfitPercent, volumeSoldPercent);
                sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("PANIC_SELL_ALERT", "พฤติกรรม: ตื่นตระหนก (Panic Sell)", message, "DANGER"));
            }
        }
    }

    // -----------------------------------------------------
    // ตัวช่วย: ฟังก์ชันเซฟลง Database แยกออกมาเพื่อให้โค้ดสะอาด
    // -----------------------------------------------------
    private void saveToDatabase(UserAccount user, String symbol, String alertType, String message, String severity,
                                Double priceChange, Double profit, Double volumeSold) {
        AnalysisData data = new AnalysisData();
        data.setUserAccount(user);
        data.setSymbol(symbol);
        data.setAlertType(alertType);
        data.setMessage(message);
        data.setSeverity(severity);
        data.setPriceChangePercent(priceChange);
        data.setProfitPercent(profit);
        data.setVolumeSoldPercent(volumeSold);

        analysisDataRepository.save(data); // 💾 เซฟลงตาราง Analysis_Data
    }

    // -----------------------------------------------------
    // ยิงผ่าน WebSocket ตรงไปที่หน้าบ้าน
    // -----------------------------------------------------
    private void sendPopupAlertToFrontend(String userId, BehaviorAlertDTO alertDTO) {
        String destination = "/topic/alerts/" + userId;
        messagingTemplate.convertAndSend(destination, alertDTO);
        System.out.println("🚨 Saved to DB & Fired WebSocket -> " + alertDTO.getAlertType());
    }
}
