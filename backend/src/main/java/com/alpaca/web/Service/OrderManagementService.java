package com.alpaca.web.Service;
import com.alpaca.web.entity.OrderHistory;
import com.alpaca.web.Repository.AccountRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.openapi.trader.model.Order;
import net.jacobpeterson.alpaca.openapi.trader.model.OrderClass;
import net.jacobpeterson.alpaca.openapi.trader.model.OrderSide;

import net.jacobpeterson.alpaca.openapi.trader.model.OrderType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service // 1. ต้องประกาศว่าเป็น Service เสมอ
@RequiredArgsConstructor // 2. ใช้ Lombok ช่วย Inject Dependency
public class OrderManagementService {
    // 3. Inject Service ด้วย final
    private final BalanceLogService balanceLogService;
    private final UserPositionService userPositionService;
    private final AccountRepository accountRepository;

    @Transactional // 4. คลุมด้วย Transaction เพื่อรักษาความถูกต้องของข้อมูล
    public void processOrderFill(OrderHistory historyToSave, UUID accountId, String orderId) {

        try {
            // ดึง userId จาก accountId เพื่อแก้ปัญหา LazyInitializationException ของ historyToSave.getUserAccount()
            Long userId = accountRepository.findByAlpacaAccountId(accountId.toString())
                    .orElseThrow(() -> new RuntimeException("User not found")).getId();

            // ป้องกัน NullPointerException
            String alpacaAccountIdStr = accountId.toString();

            log.info("🔄 Triggering BalanceLogService for User {} after Order {} fill.", userId, orderId);

            // เรียกใช้ Service
            balanceLogService.fetchAndLogBalance(userId, alpacaAccountIdStr);

            // อัปเดต UserPosition ในฐานข้อมูล
            if (historyToSave.getFilledQty() != null && historyToSave.getFilledAvgPrice() != null) {
                userPositionService.addOrUpdatePosition(
                        userId, 
                        historyToSave.getSymbol(), 
                        historyToSave.getFilledQty(), 
                        historyToSave.getFilledAvgPrice(), 
                        historyToSave.getSide()
                );
            }

        } catch (NumberFormatException nfe) {
            log.error("❌ Data formatting error: Account ID is not a valid number for order: {}", orderId, nfe);
            // โยน Exception เพื่อให้ @Transactional ทำการ Rollback
            throw new RuntimeException("Balance logic failed due to invalid data format", nfe);

        } catch (Exception e) {
            log.error("❌ Error logging balance after trade update for order: {}", orderId, e);
            throw new RuntimeException("Failed to update balance", e);
        }
    }
}
