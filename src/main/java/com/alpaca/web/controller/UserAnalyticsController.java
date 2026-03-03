package com.alpaca.web.controller;

import com.alpaca.web.Service.UserAnalyticsService;
import com.alpaca.web.dto.UserAnalyticsResult;
import com.alpaca.web.dto.TradeExecutionRecord;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<?> getUserAnalytics(@PathVariable Long userId) {
        try {
            UserAnalyticsResult result = userAnalyticsService.analyzeUserBehavior(userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            // กรณีหา User ไม่เจอ หรือ Logic ภายในแจ้ง Error เฉพาะเจาะจง
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Data processing error or User not found", "details", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace(); // ควรใช้ Logger แทนในระบบจริง
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error during analytics"));
        }
    }

    @PostMapping("/user/{userId}/update-type")
    public ResponseEntity<?> updateUserTraderType(@PathVariable Long userId, @RequestParam String newType) {
        if (newType == null || newType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Trader Type cannot be empty"));
        }

        try {
            userAnalyticsService.updateTraderType(userId, newType);
            return ResponseEntity.ok(Map.of(
                    "message", "Update Trader Type success",
                    "userId", userId,
                    "newType", newType
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update trader type"));
        }
    }
}
