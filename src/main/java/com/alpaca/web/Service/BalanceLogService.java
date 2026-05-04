package com.alpaca.web.Service;

import com.alpaca.web.Repository.BalanceRepository;
import com.alpaca.web.entity.UserBalance;
import net.jacobpeterson.alpaca.AlpacaAPI;

import net.jacobpeterson.alpaca.openapi.broker.ApiException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
public class BalanceLogService {
    private final BalanceRepository balanceRepository;
    private final AlpacaAPI alpacaAPI;

    public BalanceLogService(BalanceRepository balanceRepository, @Qualifier("brokerAPI") AlpacaAPI alpacaAPI) {
        this.balanceRepository = balanceRepository;
        this.alpacaAPI = alpacaAPI;
    }

    public UserBalance fetchAndLogBalance(Integer userId, String alpacaAccountId) throws  ApiException {

        // 1. ดึงยอดปัจจุบันจาก Alpaca API โดยระบุ Account ID เข้าไปด้วย
        // (คำสั่งดึงข้อมูลอาจแตกต่างกันนิดหน่อยตามเวอร์ชัน แต่หลักการคือต้องมี ID)
        BigDecimal currentAlpacaBalance = alpacaAPI.broker().accounts().getAccount(UUID.fromString(alpacaAccountId)).getLastEquity();

        if (currentAlpacaBalance == null) {
            currentAlpacaBalance = BigDecimal.ZERO;
        }
        // 2. ไปดูยอด "ล่าสุด" ใน Database ของเราว่ามีเท่าไหร่
        Optional<UserBalance> latestLogOpt = balanceRepository.findTopByUserIdOrderByUpdatedAtDesc(userId);

        // 3. เช็คเงื่อนไข: ถ้าเคยมี Log แล้ว และยอดเงิน "เท่ากับ" ของเดิมเป๊ะๆ
        if (latestLogOpt.isPresent()) {
            UserBalance latestLog = latestLogOpt.get();
            // ใช้ compareTo() เทียบค่า BigDecimal ถ้า return 0 แปลว่าเท่ากัน
            if (latestLog.getAvailableBalance().compareTo(currentAlpacaBalance) == 0) {
                System.out.println("ยอดเงินเท่าเดิม ไม่ต้องบันทึกซ้ำ!");
                return latestLog;
            }
        }

        // 4. ถ้าเพิ่งเคยดึงครั้งแรก หรือ ยอดเงินไม่เท่าเดิม (มีการซื้อขาย) ถึงจะบันทึก Log ใหม่
        UserBalance newLog = new UserBalance();
        newLog.setUserId(userId);
        newLog.setAvailableBalance(currentAlpacaBalance);

        System.out.println("ยอดเงินเปลี่ยนไป! ทำการบันทึก Log ใหม่");
        return balanceRepository.save(newLog);
    }
}
