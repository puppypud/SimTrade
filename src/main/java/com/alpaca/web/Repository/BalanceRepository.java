package com.alpaca.web.Repository;

import com.alpaca.web.entity.UserBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BalanceRepository extends JpaRepository<UserBalance, Integer> {

    Optional<UserBalance> findTopByUserIdOrderByUpdatedAtDesc(Integer userId);

}
