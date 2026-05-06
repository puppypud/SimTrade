package com.alpaca.web.Service;
import com.alpaca.web.entity.OrderHistory;
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

    @Transactional // 4. คลุมด้วย Transaction เพื่อรักษาความถูกต้องของข้อมูล
    public void processOrderFill(OrderHistory historyToSave, UUID accountId, String orderId) {

        if (historyToSave.getUserAccount() == null || historyToSave.getUserAccount().getId() == null) {
            log.warn("⚠️ Cannot log balance: UserAccount or UserId is missing for Order {}", orderId);
            return;
        }

        try {
            // 5. ใช้ ID ที่เป็นตัวเลข หรือ Primary Key ของระบบเราเองแทนการเอา AccountNumber ไปแปลงเป็น Integer
            Long userId = historyToSave.getUserAccount().getId();

            // ป้องกัน NullPointerException
            String alpacaAccountIdStr = (accountId != null) ? accountId.toString() : null;

            log.info("🔄 Triggering BalanceLogService for User {} after Order {} fill.", userId, orderId);

            // เรียกใช้ Service
            balanceLogService.fetchAndLogBalance(userId, alpacaAccountIdStr);

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
