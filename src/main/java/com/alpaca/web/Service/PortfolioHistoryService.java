package com.alpaca.web.Service;

import com.alpaca.web.entity.PortfolioHistory;
import com.alpaca.web.Repository.PortfolioHistoryRepository;
import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.entity.UserAccount;
import net.jacobpeterson.alpaca.openapi.broker.model.TradeAccount;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


@Service
public class PortfolioHistoryService {
    @Autowired
    private PortfolioHistoryRepository historyRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private BrokerService brokerService;

    // ระบบจะเรียกใช้ Method นี้เพื่อถ่าย Snapshot พอร์ต (ตั้งเวลาไว้ทุกสิ้นวัน)
    @Transactional
    public PortfolioHistory recordDailySnapshot(PortfolioHistory historyData) {
        // ไม่ต้องเช็คของเก่า ให้ Insert แถวใหม่ลง Database เลย
        return historyRepository.save(historyData);
    }

    // 🕒 ตั้งเวลาทำงานอัตโนมัติ: ตัวอย่างทำงานทุกวันเวลาเที่ยงคืน (00:00) 
    // หรือตอนตลาดปิด เช่น "0 0 16 * * ?" (4 โมงเย็นทุกวัน)
    // ตรงนี้ผมใส่ให้รันทุกวันเวลาเที่ยงคืน (00:00) ของระบบเซิร์ฟเวอร์
    @Scheduled(cron = "0 0 0 * * ?")
    public void captureAllUsersPortfolioDaily() {
        List<UserAccount> users = accountRepository.findAll();
        for (UserAccount user : users) {
            try {
                if (user.getAlpacaAccountId() != null) {
                    TradeAccount account = brokerService.getAccount(UUID.fromString(user.getAlpacaAccountId()));
                    
                    PortfolioHistory snapshot = new PortfolioHistory();
                    snapshot.setUserId(user.getId());
                    snapshot.setTotalPortfolioValue(account.getEquity());
                    snapshot.setBuyingPower(account.getBuyingPower());
                    snapshot.setCashBalance(account.getCash());
                    // Snapshot.setUnrealizedPnl(...); ถ้ามี API ให้เรียกเพิ่มเติม
                    
                    recordDailySnapshot(snapshot);
                    System.out.println("✅ Snapshot saved for User ID: " + user.getId());
                }
            } catch (Exception e) {
                System.err.println("❌ Failed to snapshot portfolio for User ID: " + user.getId() + " - " + e.getMessage());
            }
        }
    }
}
