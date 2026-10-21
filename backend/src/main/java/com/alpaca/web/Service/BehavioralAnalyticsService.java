package com.alpaca.web.Service;

import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.Repository.AnalysisDataRepository;
import com.alpaca.web.corsconfig.RiskConfig;
import com.alpaca.web.dto.BehaviorAlertDTO;

import com.alpaca.web.entity.AnalysisData;
import com.alpaca.web.entity.UserAccount;
import com.alpaca.web.entity.UserPosition;
import com.alpaca.web.Repository.UserPositionRepository;
import com.alpaca.web.enums.TraderType;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Optional;

@Service
public class BehavioralAnalyticsService {
    private final SimpMessagingTemplate messagingTemplate;
    private final AnalysisDataRepository analysisDataRepository;
    private final AccountRepository accountRepository;
    private final UserPositionRepository userPositionRepository;
    private final Cache<String, AtomicInteger> orderFrequencyCache;

    public BehavioralAnalyticsService(SimpMessagingTemplate messagingTemplate,
                                      AnalysisDataRepository analysisDataRepository,
                                      AccountRepository accountRepository,
                                      UserPositionRepository userPositionRepository) {
        this.messagingTemplate = messagingTemplate;
        this.analysisDataRepository = analysisDataRepository;
        this.accountRepository = accountRepository;
        this.userPositionRepository = userPositionRepository;

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

        // --- เพิ่ม Logging เพื่อ Debug ---
        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(BehavioralAnalyticsService.class);
        log.info("📊 [Evaluate] userId={}, symbol={}, side={}, priceChange={}%, ConfigTraderType={}", 
                userId, symbol, side, priceChangePercent, traderType);
        log.info("   [Config Values] fomoMaxOrders={}, fomoPriceSurgePercent={}%", 
                config.fomoMaxOrders, config.fomoPriceSurgePercent);
        // -----------------------------

        // -----------------------------------------------------
        // Rule 1: FOMO (ฝั่งซื้อ)
        // -----------------------------------------------------
        if (side.equalsIgnoreCase("buy")) {
            String cacheKey = userId + "-buy";
            AtomicInteger orderCount = orderFrequencyCache.get(cacheKey, k -> new AtomicInteger(0));
            int currentCount = orderCount.incrementAndGet();

            log.info("   [FOMO Check] currentCount={}, requiredCount={}. priceChange={} >= requiredSurge={}", 
                    currentCount, config.fomoMaxOrders, priceChangePercent, config.fomoPriceSurgePercent);

            if (currentCount >= config.fomoMaxOrders && priceChangePercent >= config.fomoPriceSurgePercent) {
                AnalysisData.FeedbackTemplateDTO template = AnalysisData.feedbackConfig.getOrDefault("FOMO_ALERT", 
                    new AnalysisData.FeedbackTemplateDTO("อาการ: กลัวตกรถ (FOMO)", "ตรวจพบพฤติกรรมไล่ราคา (FOMO) เนื่องจากมีการส่งคำสั่งซื้อถี่เกินไปในขณะที่ราคากำลังพุ่งสูง", "WARNING"));
                String message = template.message;

                // 1. บันทึกลง Database
                saveToDatabase(user, symbol, "FOMO_ALERT", message, template.severity, priceChangePercent, null);

                // 2. สร้าง DTO และยิง WebSocket ไปหน้าบ้าน
                sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("FOMO_ALERT", template.title, message, template.severity));

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
                
                AnalysisData.FeedbackTemplateDTO template = AnalysisData.feedbackConfig.getOrDefault("SELL_EARLY_ALERT", 
                    new AnalysisData.FeedbackTemplateDTO("อาการ: รีบขายหมู (Sell Early)", "ตรวจพบพฤติกรรมรีบขายทำกำไร (Sell Early) ก่อนถึงเป้าหมายที่วางไว้", "INFO"));
                String message = template.message;

                saveToDatabase(user, symbol, "SELL_EARLY_ALERT", message, template.severity, null, currentProfitPercent);
                sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("SELL_EARLY_ALERT", template.title, message, template.severity));
            }

            // Rule 3: Panic Sell
            if (priceChangePercent <= config.panicSellPriceDropPercent && volumeSoldPercent >= config.panicSellVolumePercent) {
                
                AnalysisData.FeedbackTemplateDTO template = AnalysisData.feedbackConfig.getOrDefault("PANIC_SELL_ALERT", 
                    new AnalysisData.FeedbackTemplateDTO("อาการ: ตื่นตระหนก (Panic Sell)", "ตรวจพบพฤติกรรมตื่นตระหนก (Panic Sell) โดยการเทขายหุ้นสัดส่วนสูงในขณะที่ราคาร่วงลงรุนแรง", "DANGER"));
                String message = template.message;

                saveToDatabase(user, symbol, "PANIC_SELL_ALERT", message, template.severity, priceChangePercent, currentProfitPercent);
                sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("PANIC_SELL_ALERT", template.title, message, template.severity));
            }

            // Rule 4: Holding Losers Too Long
            if (currentProfitPercent <= config.holdingLoserLossPercent) {
                Optional<UserPosition> positionOpt = userPositionRepository.findByUserIdAndSymbol(userId, symbol);
                if (positionOpt.isPresent()) {
                    long holdingDays = Duration.between(positionOpt.get().getCreatedAt(), LocalDateTime.now()).toDays();
                    if (holdingDays >= config.holdingLoserMaxDays) {
                        AnalysisData.FeedbackTemplateDTO template = AnalysisData.feedbackConfig.getOrDefault("HOLDING_LOSERS_ALERT", 
                            new AnalysisData.FeedbackTemplateDTO("อาการ: ทนถือขาดทุน (Hold Losers)", "ตรวจพบพฤติกรรมทนถือหุ้นที่ขาดทุนหนักเป็นเวลานานเกินไป ควรพิจารณาตั้งจุดตัดขาดทุน (Cut Loss)", "WARNING"));
                        String message = template.message;

                        saveToDatabase(user, symbol, "HOLDING_LOSERS_ALERT", message, template.severity, null, currentProfitPercent);
                        sendPopupAlertToFrontend(userId.toString(), new BehaviorAlertDTO("HOLDING_LOSERS_ALERT", template.title, message, template.severity));
                    }
                }
            }
        }
    }

    // -----------------------------------------------------
    // ตัวช่วย: ฟังก์ชันเซฟลง Database แยกออกมาเพื่อให้โค้ดสะอาด
    // -----------------------------------------------------
    private void saveToDatabase(UserAccount user, String symbol, String alertType, String message, String severity,
                                Double priceChange, Double profit) {
        AnalysisData data = new AnalysisData();
        data.setUserAccount(user);
        data.setSymbol(symbol);
        data.setAlertType(alertType);
        data.setMessage(message);
        data.setSeverity(severity);
        data.setPriceChangePercent(priceChange);
        data.setProfitPercent(profit);
        analysisDataRepository.save(data);
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
