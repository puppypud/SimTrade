package com.alpaca.web.Repository;
import com.alpaca.web.entity.PortfolioHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
@Repository
public interface PortfolioHistoryRepository extends JpaRepository<PortfolioHistory, Long> {
    List<PortfolioHistory> findByUserIdOrderByRecordedAtAsc(Long userId);
}
