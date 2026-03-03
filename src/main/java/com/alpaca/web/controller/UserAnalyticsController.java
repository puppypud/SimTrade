package com.alpaca.web.controller;

import com.alpaca.web.Service.UserAnalyticsService;
import com.alpaca.web.dto.UserAnalyticsResult;
import com.alpaca.web.dto.TradeExecutionRecord;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost"})
public class UserAnalyticsController {
    private final UserAnalyticsService userAnalyticsService;

    public UserAnalyticsController(UserAnalyticsService userAnalyticsService) {
        this.userAnalyticsService = userAnalyticsService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<UserAnalyticsResult> getUserAnalytics(@PathVariable Long userId) {
        try {
            // โยนเข้า Service เพื่อทำการประมวลผล FIFO และ Rule Engine สดๆ
            UserAnalyticsResult result = userAnalyticsService.analyzeUserBehavior(userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            // จัดการกรณีหา User ไม่เจอ
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            // จัดการ Error อื่นๆ ในการประมวลผล
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/user/{userId}/update-type")
    public ResponseEntity<?> updateUserTraderType(@PathVariable Long userId, @RequestParam String newType) {
        try {
            userAnalyticsService.updateTraderType(userId, newType);
            return ResponseEntity.ok(Map.of("message", "อัปเดตประเภทนักเทรดเรียบร้อยแล้ว", "newType", newType));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "เกิดข้อผิดพลาดในการบันทึกข้อมูล"));
        }
    }
}
