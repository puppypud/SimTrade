package com.alpaca.web.Repository;
import com.alpaca.web.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
/*find = SELECT * FROM order_history
By = แปลงเป็นคำสั่ง WHERE
UserAccount_Id = user_account_id = ? (ดึงข้อมูลจากพารามิเตอร์ userId ที่รับมา)
OrderBy = แปลงเป็นคำสั่ง ORDER BY
        FilledAt = ฟิลด์ filled_at
        Desc = เรียงจากมากไปน้อย (ล่าสุดขึ้นก่อน)*/
@Repository
public interface AccountRepository extends JpaRepository<UserAccount, Long> {
    // สามารถเพิ่ม Custom Query ได้ง่ายๆ เช่น
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByAlpacaAccountId(String alpacaAccountId);
}
//findByCreatedAt(Timestamp createdAt)
//
//find = SELECT * FROM order_history
//
//By = แปลงเป็นคำสั่ง WHERE
//
//CreatedAt = created_at = ?
//👉 ผลลัพธ์ SQL ที่ได้เบื้องหลัง: SELECT * FROM order_history WHERE created_at = ?;
