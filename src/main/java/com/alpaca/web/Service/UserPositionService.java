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

    // Method สำหรับบันทึกเมื่อ User กดซื้อหุ้นสำเร็จ
    @Transactional
    public void addOrUpdatePosition(Long userId, String symbol, BigDecimal buyQty, BigDecimal buyPrice) {

        // 1. ค้นหาก่อนว่ามีหุ้นตัวนี้ในพอร์ตไหม
        Optional<UserPosition> existingPosition = positionRepository.findByUserIdAndSymbol(userId, symbol);

        if (existingPosition.isPresent()) {
            // กรณีที่ 1: มีหุ้นอยู่แล้ว -> อัปเดตของเดิม
            UserPosition position = existingPosition.get();

            // สูตรคำนวณต้นทุนเฉลี่ย: ((จำนวนเดิม * ราคาเดิม) + (จำนวนใหม่ * ราคาใหม่)) / จำนวนรวม
            BigDecimal oldTotalValue = position.getQuantity().multiply(position.getAverageEntryPrice());
            BigDecimal newTotalValue = buyQty.multiply(buyPrice);

            BigDecimal newQuantity = position.getQuantity().add(buyQty);
            BigDecimal newAvgPrice = oldTotalValue.add(newTotalValue)
                    .divide(newQuantity, 4, RoundingMode.HALF_UP);

            position.setQuantity(newQuantity);
            position.setAverageEntryPrice(newAvgPrice);

            positionRepository.save(position); // สั่ง Update

        } else {
            // กรณีที่ 2: เพิ่งซื้อครั้งแรก -> สร้างแถวใหม่
            UserPosition newPosition = new UserPosition();
            newPosition.setUserId(userId);
            newPosition.setSymbol(symbol);
            newPosition.setQuantity(buyQty);
            newPosition.setAverageEntryPrice(buyPrice);
            // newPosition.setAssetClass("us_equity"); // ถ้าคุณมี Column นี้

            positionRepository.save(newPosition); // สั่ง Insert
        }
    }
}
