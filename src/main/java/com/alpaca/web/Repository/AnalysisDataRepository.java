package com.alpaca.web.Repository;
import com.alpaca.web.entity.AnalysisData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisDataRepository extends JpaRepository<AnalysisData, Long> {

}
