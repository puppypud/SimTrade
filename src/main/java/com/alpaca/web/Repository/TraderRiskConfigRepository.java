package com.alpaca.web.Repository;

import com.alpaca.web.entity.TraderRiskConfig;
import com.alpaca.web.enums.TraderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TraderRiskConfigRepository extends JpaRepository<TraderRiskConfig, TraderType> {
}
