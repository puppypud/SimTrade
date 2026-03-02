package com.alpaca.web.Repository;

import com.alpaca.web.entity.OrderHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import com.alpaca.web.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderHistoryRepository extends JpaRepository<OrderHistory, String> {
    List<OrderHistory> findByUserAccount_IdOrderByFilledAtDesc(Long userId);
    List<OrderHistory> findByCreatedAt(Timestamp createdAt);
    List<OrderHistory> findByUserAccount_AlpacaAccountIdOrderByCreatedAtDesc(String alpacaAccountId);

}
