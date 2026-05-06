package com.alpaca.web.Service;

import com.alpaca.web.entity.PortfolioHistory;
import com.alpaca.web.Repository.PortfolioHistoryRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class PortfolioHistoryService {
    @Autowired
    private PortfolioHistoryRepository historyRepository;

    // ระบบ (Cron Job สิ้นวัน) จะเรียกใช้ Method นี้เพื่อถ่าย Snapshot พอร์ต
    @Transactional
    public PortfolioHistory recordDailySnapshot(PortfolioHistory historyData) {
        // ไม่ต้องเช็คของเก่า ให้ Insert แถวใหม่ลง Database เลย
        return historyRepository.save(historyData);
    }
}
