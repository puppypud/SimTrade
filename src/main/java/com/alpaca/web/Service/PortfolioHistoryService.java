package com.alpaca.web.Service;

import com.alpaca.web.entity.PortfolioHistory;
import com.alpaca.web.Repository.PortfolioHistoryRepository;
import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.entity.UserAccount;
import net.jacobpeterson.alpaca.openapi.broker.model.Position;
import net.jacobpeterson.alpaca.openapi.broker.model.TradeAccount;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
public class PortfolioHistoryService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioHistoryService.class);

    @Autowired
    private PortfolioHistoryRepository historyRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private BrokerService brokerService;

    // ─────────────────────────────────────────────
    // บันทึก Snapshot เดี่ยว (ใช้เรียกได้จากทุกที่)
    // ─────────────────────────────────────────────
    @Transactional
    public PortfolioHistory recordDailySnapshot(PortfolioHistory historyData) {
        return historyRepository.save(historyData);
    }

    // ─────────────────────────────────────────────
    // ถ่าย Snapshot user คนเดียว
    // ─────────────────────────────────────────────
    public void snapshotUser(UserAccount user) {
        if (user.getAlpacaAccountId() == null) {
            log.warn("⚠️ User {} ไม่มี AlpacaAccountId ข้ามไป", user.getId());
            return;
        }
        try {
            UUID alpacaId = UUID.fromString(user.getAlpacaAccountId());
            TradeAccount account = brokerService.getAccount(alpacaId);

            // ดึง Positions เพื่อคำนวณ totalStockValue และ unrealizedPnl
            List<Position> positions = brokerService.getPositions(alpacaId);

            BigDecimal totalStockValue = positions.stream()
                    .map(p -> p.getMarketValue() != null ? p.getMarketValue() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal unrealizedPnl = positions.stream()
                    .map(p -> p.getUnrealizedPl() != null ? p.getUnrealizedPl() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            PortfolioHistory snapshot = new PortfolioHistory();
            snapshot.setUserId(user.getId());
            snapshot.setTotalPortfolioValue(account.getEquity());
            snapshot.setBuyingPower(account.getBuyingPower());
            snapshot.setCashBalance(account.getCash());
            snapshot.setTotalStockValue(totalStockValue);
            snapshot.setUnrealizedPnl(unrealizedPnl);

            // คำนวณ daily return % จาก lastEquity (equity เมื่อวานกับวันนี้)
            if (account.getLastEquity() != null
                    && account.getLastEquity().compareTo(BigDecimal.ZERO) != 0
                    && account.getEquity() != null) {
                BigDecimal change = account.getEquity().subtract(account.getLastEquity());
                BigDecimal pct = change
                        .divide(account.getLastEquity(), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(2, RoundingMode.HALF_UP);
                snapshot.setDailyReturnPercent(pct);
            }

            recordDailySnapshot(snapshot);
            log.info("✅ Snapshot บันทึกสำเร็จ → User: {} | Equity: {} | StockVal: {} | PnL: {}",
                    user.getId(), account.getEquity(), totalStockValue, unrealizedPnl);

        } catch (Exception e) {
            log.error("❌ Snapshot ล้มเหลว User: {} → {}", user.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────
    // ถ่าย Snapshot ทุก User (เรียกได้จาก Admin API หรือ Scheduler)
    // ─────────────────────────────────────────────
    public int snapshotAllUsers() {
        List<UserAccount> users = accountRepository.findAll();
        int successCount = 0;
        for (UserAccount user : users) {
            try {
                snapshotUser(user);
                successCount++;
            } catch (Exception e) {
                log.error("❌ snapshotAllUsers: ข้ามผ่าน User {} เพราะ: {}", user.getId(), e.getMessage());
            }
        }
        log.info("📊 Portfolio Snapshot เสร็จสิ้น: {}/{} users", successCount, users.size());
        return successCount;
    }

    // ─────────────────────────────────────────────
    // Cron Job: รันอัตโนมัติทุกวัน 16:00 (ตลาดปิด EST)
    // ปรับ cron ได้:
    //   "0 0 16 * * ?" = 4PM ทุกวัน (default)
    //   "0 0 0  * * ?" = เที่ยงคืน
    //   "0 */5 * * * ?" = ทุก 5 นาที (ทดสอบ)
    // ─────────────────────────────────────────────
    @Scheduled(cron = "0 0 16 * * ?")
    public void captureAllUsersPortfolioDaily() {
        log.info("⏰ [Scheduler] เริ่มถ่าย Portfolio Snapshot ประจำวัน...");
        int count = snapshotAllUsers();
        log.info("✅ [Scheduler] เสร็จสิ้น: {} snapshots", count);
    }
}
