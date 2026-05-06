package com.alpaca.web.controller;

import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.Service.BehavioralAnalyticsService;
import com.alpaca.web.Service.UserAnalyticsService;
import com.alpaca.web.dto.TradeRequestDTO;
import com.alpaca.web.dto.UserAnalyticsResult;
import com.alpaca.web.dto.TradeExecutionRecord;
import com.alpaca.web.entity.UserAccount;
import com.alpaca.web.enums.TraderType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost"})
public class UserAnalyticsController {
    private final UserAnalyticsService userAnalyticsService;
    private final AccountRepository accountRepository;
    private final BehavioralAnalyticsService behavioralAnalyticsService;

    public UserAnalyticsController(UserAnalyticsService userAnalyticsService, AccountRepository accountRepository, BehavioralAnalyticsService behavioralAnalyticsService) {
        this.userAnalyticsService = userAnalyticsService;
        this.accountRepository = accountRepository;
        this.behavioralAnalyticsService = behavioralAnalyticsService;
    }

    // ดึง traderType ล่าสุดจากฐานข้อมูล (ผลจากการทำ Quiz/Onboarding)
    @GetMapping("/user/{userId}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        try {
            UserAccount user = accountRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "traderType", user.getTraderType() != null ? user.getTraderType() : "Unknown",
                    "riskBehavior", user.getRiskBehavior() != null ? user.getRiskBehavior() : "Unknown"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found", "details", e.getMessage()));
        }
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
                    "newType", newType));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update trader type"));
        }
    }

    @PostMapping("/execute")
    public ResponseEntity<String> executeTrade(@RequestBody TradeRequestDTO request) {

        // ---------------------------------------------------------
        // 1. (ส่วนของการเทรดจริง) บันทึก Order ลง DB หรือส่งไป Alpaca
        // ---------------------------------------------------------
        // alpacaTradingService.placeOrder(request.getSymbol(), request.getSide(), ...);
        // orderHistoryRepository.save(newOrder);

        // ---------------------------------------------------------
        // 2. 🚀 (ส่วนของเรา) เรียกใช้ Rule Engine วิเคราะห์พฤติกรรมทันที!
        // ---------------------------------------------------------

        // ถ้าหน้าบ้านไม่ได้ส่ง TraderType มา เราก็ดึงจาก DB ของ User คนนั้น
        if (typeToUse == null) {
            UserAccount user = accountRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            String traderTypeStr = user.getTraderType() != null ? user.getTraderType() : "DAY_TRADER";
            String normalizedType = traderTypeStr.toUpperCase().replace(" ", "_");
            typeToUse = TraderType.valueOf(normalizedType);
        }

        // โยนข้อมูลเข้า Service ที่เราเขียนไว้
        behavioralAnalyticsService.evaluateOrderEvent(
                request.getUserId(),
                request.getSymbol(),
                request.getSide(),
                request.getCurrentProfitPercent(),
                request.getPriceChangePercent(),
                request.getVolumeSoldPercent(),
                typeToUse
        );

        // 3. ตอบกลับหน้าบ้านว่ารับออเดอร์สำเร็จ (ส่วน Notification จะวิ่งไปทาง WebSocket เอง)
        return ResponseEntity.ok("Order executed and analyzed successfully!");
    }
}
