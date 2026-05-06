package com.alpaca.web.Service;
import com.alpaca.web.Repository.UserPositionRepository;
import com.alpaca.web.entity.UserPosition;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
public class UserPositionService {
    @Autowired
    private UserPositionRepository positionRepository;

    // Method สำหรับบันทึกเมื่อ User กดซื้อหรือขายหุ้นสำเร็จ
    @Transactional
    public void addOrUpdatePosition(Long userId, String symbol, BigDecimal filledQty, BigDecimal filledAvgPrice, String side) {

        // 1. ค้นหาก่อนว่ามีหุ้นตัวนี้ในพอร์ตไหม
        Optional<UserPosition> existingPosition = positionRepository.findByUserIdAndSymbol(userId, symbol);

        if (existingPosition.isPresent()) {
            UserPosition position = existingPosition.get();

            if ("BUY".equalsIgnoreCase(side)) {
                // สูตรคำนวณต้นทุนเฉลี่ย: ((จำนวนเดิม * ราคาเดิม) + (จำนวนใหม่ * ราคาใหม่)) / จำนวนรวม
                BigDecimal oldTotalValue = position.getQuantity().multiply(position.getAverageEntryPrice());
                BigDecimal newTotalValue = filledQty.multiply(filledAvgPrice);

                BigDecimal newQuantity = position.getQuantity().add(filledQty);
                BigDecimal newAvgPrice = oldTotalValue.add(newTotalValue)
                        .divide(newQuantity, 4, RoundingMode.HALF_UP);

                position.setQuantity(newQuantity);
                position.setAverageEntryPrice(newAvgPrice);
                positionRepository.save(position);
            } else if ("SELL".equalsIgnoreCase(side)) {
                BigDecimal newQuantity = position.getQuantity().subtract(filledQty);
                if (newQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                    positionRepository.delete(position);
                } else {
                    position.setQuantity(newQuantity);
                    // ราคาต้นทุนเฉลี่ย (averageEntryPrice) คงเดิมเมื่อมีการขาย
                    positionRepository.save(position);
                }
            }

        } else {
            if ("BUY".equalsIgnoreCase(side)) {
                UserPosition newPosition = new UserPosition();
                newPosition.setUserId(userId);
                newPosition.setSymbol(symbol);
                newPosition.setQuantity(filledQty);
                newPosition.setAverageEntryPrice(filledAvgPrice);
                positionRepository.save(newPosition);
            }
        }
    }
}
