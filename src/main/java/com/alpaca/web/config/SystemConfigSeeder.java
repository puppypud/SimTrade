package com.alpaca.web.config;

import com.alpaca.web.Repository.FeedbackTemplateRepository;
import com.alpaca.web.Repository.TraderRiskConfigRepository;
import com.alpaca.web.corsconfig.RiskConfig;
import com.alpaca.web.entity.FeedbackTemplate;
import com.alpaca.web.entity.TraderRiskConfig;
import com.alpaca.web.enums.TraderType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SystemConfigSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SystemConfigSeeder.class);

    private final TraderRiskConfigRepository riskConfigRepository;
    private final FeedbackTemplateRepository feedbackTemplateRepository;

    public SystemConfigSeeder(TraderRiskConfigRepository riskConfigRepository,
                              FeedbackTemplateRepository feedbackTemplateRepository) {
        this.riskConfigRepository = riskConfigRepository;
        this.feedbackTemplateRepository = feedbackTemplateRepository;
    }

    @Override
    public void run(String... args) {
        seedRiskConfigs();
        seedFeedbackTemplates();
    }

    private void seedRiskConfigs() {
        if (riskConfigRepository.count() == 0) {
            log.info("Seeding initial TraderRiskConfig data...");
            Arrays.stream(TraderType.values()).forEach(type -> {
                RiskConfig oldConfig = RiskConfig.getConfig(type);
                TraderRiskConfig newConfig = new TraderRiskConfig(
                        type,
                        oldConfig.fomoTimeWindowSeconds,
                        oldConfig.fomoMaxOrders,
                        oldConfig.fomoPriceSurgePercent,
                        oldConfig.takeProfitExpectedPercent,
                        oldConfig.sellingTooEarlyTriggerPercent,
                        oldConfig.panicSellPriceDropPercent,
                        oldConfig.panicSellVolumePercent,
                        oldConfig.holdingLoserLossPercent,
                        oldConfig.holdingLoserMaxDays
                );
                riskConfigRepository.save(newConfig);
            });
            log.info("Seeded TraderRiskConfig.");
        }
    }

    private void seedFeedbackTemplates() {
        if (feedbackTemplateRepository.count() == 0) {
            log.info("Seeding initial FeedbackTemplate data...");
            
            FeedbackTemplate fomo = new FeedbackTemplate();
            fomo.setAlertType("FOMO_ALERT");
            fomo.setTitle("อาการ: กลัวตกรถ (FOMO)");
            fomo.setMessage("ตรวจพบพฤติกรรมไล่ราคา (FOMO) เนื่องจากมีการส่งคำสั่งซื้อถี่เกินไปในขณะที่ราคากำลังพุ่งสูง");
            fomo.setSeverity("WARNING");
            feedbackTemplateRepository.save(fomo);

            FeedbackTemplate early = new FeedbackTemplate();
            early.setAlertType("SELL_EARLY_ALERT");
            early.setTitle("อาการ: รีบขายหมู (Sell Early)");
            early.setMessage("ตรวจพบพฤติกรรมรีบขายทำกำไร (Sell Early) ก่อนถึงเป้าหมายที่วางไว้");
            early.setSeverity("INFO");
            feedbackTemplateRepository.save(early);

            FeedbackTemplate panic = new FeedbackTemplate();
            panic.setAlertType("PANIC_SELL_ALERT");
            panic.setTitle("อาการ: ตื่นตระหนก (Panic Sell)");
            panic.setMessage("ตรวจพบพฤติกรรมตื่นตระหนก (Panic Sell) โดยการเทขายหุ้นสัดส่วนสูงในขณะที่ราคาร่วงลงรุนแรง");
            panic.setSeverity("DANGER");
            feedbackTemplateRepository.save(panic);

            log.info("Seeded FeedbackTemplate.");
        }
    }
}
