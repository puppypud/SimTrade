package com.alpaca.web.Repository;
import com.alpaca.web.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<UserAccount, Long> {
    // สามารถเพิ่ม Custom Query ได้ง่ายๆ เช่น
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByAlpacaAccountId(String alpacaAccountId);
}
