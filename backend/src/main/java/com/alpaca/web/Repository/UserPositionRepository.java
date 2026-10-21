package com.alpaca.web.Repository;
import com.alpaca.web.entity.UserPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPositionRepository  extends JpaRepository<UserPosition, Long> {

    // Spring Data JPA จะเขียน SQL SELECT ให้เองจากชื่อ Method
    // ใช้เพื่อค้นหาว่า User คนนี้ มีหุ้นตัวนี้อยู่แล้วหรือไม่?
    Optional<UserPosition> findByUserIdAndSymbol(Long userId, String symbol);

    // ใช้ดึงพอร์ตหุ้นทั้งหมดของ User คนนั้น มาแสดงหน้าเว็บ
    List<UserPosition> findAllByUserId(Long userId);
}
