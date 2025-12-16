package com.alpaca.web.controller;

import com.alpaca.web.Service.BrokerService;
import com.alpaca.web.Service.MarketDataService;
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import org.slf4j.Logger;
import net.jacobpeterson.alpaca.openapi.broker.model.*; // Import ของ Alpaca
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("broker")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost"})
public class BrokerController {

    private final Logger log = LoggerFactory.getLogger(BrokerController.class);
    private final BrokerService brokerService;       // แนะนำให้ใช้ตัวเล็กนำหน้า (camelCase)
    private final MarketDataService marketDataService; // 1. เพิ่มตัวแปร Service

    //เพิ่มใน Constructor ให้ Spring ส่งเข้ามาให้  ต้องประกาศ@Service
    public BrokerController(BrokerService brokerService, MarketDataService marketDataService) {
        this.brokerService = brokerService;
        this.marketDataService = marketDataService;
    }


    @PostMapping("/order/user")
    public ResponseEntity<?> buyStockForUser(
            @RequestParam("accountId") UUID accountId,
            @RequestParam("symbol") String symbol,
            @RequestParam(value = "qty", required = false) BigDecimal qty,          // แก้เป็น optional
            @RequestParam(value = "notional", required = false) BigDecimal notional,
            @RequestParam(value = "limitPrice", required = false) BigDecimal limitPrice,
            @RequestParam("OrderSide") String orderSideStr,
            @RequestParam("OrderType") String orderTypeStr,
            @RequestParam("TimeInForce") String timeInForceStr) throws Exception {
        try {
            // --- เริ่มต้น Validation ---
            // เรียกใช้ Service ภายใน (ไม่ได้ยิงผ่าน HTTP) เพื่อเช็คสภาพคล่อง
            Map<String, Object> quote = marketDataService.getLatestQuote(symbol);

            // ถ้าเป็นคำสั่งซื้อ (BUY) และเป็น Market Order ลองเช็คว่ามีคนขายไหม (Ask > 0)
            if (OrderSide.valueOf(orderSideStr) == OrderSide.BUY && OrderType.valueOf(orderTypeStr) == OrderType.MARKET) {
                if (quote.containsKey("askPrice")) {
                    double currentAsk = Double.parseDouble(quote.get("askPrice").toString());
                    // ถ้า Ask เป็น 0 แปลว่าไม่มีคนขาย หรือตลาดปิด
                    if (currentAsk == 0) {
                        return ResponseEntity.badRequest().body("❌ ไม่สามารถซื้อได้ในขณะนี้ (ไม่มีสภาพคล่อง/ตลาดปิด)");
                    }
                }
            }
            // --- จบ Validation ---

            OrderSide side = OrderSide.valueOf(orderSideStr);
            OrderType type = OrderType.valueOf(orderTypeStr);
            TimeInForce Time = TimeInForce.valueOf(timeInForceStr);

            log.info("OrderSide " + side + " " + type + " " + Time);
            log.info("order is " + side + " " + " to account is " + accountId);

            Order order = brokerService.createOrder(
                    accountId,
                    symbol.toUpperCase(),
                    qty,        // ส่ง qty (อาจเป็น null)
                    notional,   // ส่ง notional (อาจเป็น null)
                    side,
                    type,
                    Time,
                    limitPrice
            );
            return ResponseEntity.ok("Order created successfully: " + order.getId());

        } catch (IllegalArgumentException e) {
            // ดักจับ Error กรณีใส่มาทั้งคู่ หรือไม่ใส่เลย (จาก logic ใน service)
            log.error("Validation Error: {}", e.getMessage());
            return ResponseEntity.badRequest().body("❌ Validation Error: " + e.getMessage());
        } catch (Exception e) {
            log.error("Internal Error", e);
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @PostMapping("/order/cancel")
    public ResponseEntity<?> cancelOrderForAccount(
            @RequestParam("accountId") UUID accountId,
            @RequestParam("orderId") String orderId) {
        log.info("cancelOrderForAccount accountId: " + accountId + " orderId: " + orderId);
        try {
            brokerService.cancelOrderForAccount(accountId, orderId);
            return ResponseEntity.ok("order successfully cancelled" + orderId);
        } catch (Exception e) {
            log.error("error" + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ Cancellation Failed. Error: " + e.getMessage());
        }
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getSingleOrder(
            @RequestParam("accountId") UUID accountId,
            @PathVariable("orderId") String orderId
    ) {
        try {
            // ต้องเรียก Service ไม่ใช่เรียก Method ตัวเอง
            Order order = brokerService.getSingleOrder(accountId, orderId);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ Order ID: " + orderId + " not found.");
        }
    }

    @GetMapping("/order/get/all-order")
    public ResponseEntity<?> getAllOrders(
            @RequestParam("accountId") UUID accountId,
            @RequestParam(value = "status", required = false, defaultValue = "all") String status,
            @RequestParam(value = "limit", required = false, defaultValue = "50") Integer limit,
            @RequestParam(value = "symbols", required = false) String symbols

    ) {

        try {

            List<Order> orders = brokerService.getAllOrders(accountId, status, limit, symbols);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Failed to get all orders for account {}", accountId, e);
            return ResponseEntity.internalServerError().body("❌ Failed to retrieve orders. Error: " + e.getMessage());
        }

    }

    @GetMapping("/order/stock-bar")
    public ResponseEntity<?> getStockBar(
            @RequestParam("symbols") String symbols,
            @RequestParam("viewType") String viewType
    ) {
        try {
            List<StockBar> stockBars = marketDataService.getStockBars(symbols, viewType);
            return ResponseEntity.ok(stockBars);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Server Error: " + e.getMessage());
        }
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<?> getAccountInfo(
            @PathVariable("accountId") UUID accountId) {
        try {
            TradeAccount account = brokerService.getAccount(accountId);

            return ResponseEntity.ok(account); // ส่งกลับข้อมูลทั้งหมด
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/positions/{accountId}")
    public ResponseEntity<?> getPositionInfo(
            @PathVariable("accountId") UUID accountId
    ) {
        try {
            List<Position> positions = brokerService.getPositions(accountId);
            return ResponseEntity.ok(positions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("❌ Failed to get positions. Error: " + e.getMessage());
        }
    }

    @GetMapping("/quote")
    public ResponseEntity<?> getLatestQuote(
            @RequestParam("symbol") String symbol) {
        try {
            // เรียก snapshot ทีเดียวได้ครบ
            Map<String, Object> data = marketDataService.getLatestQuote(symbol);

            if (data.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ ไม่พบข้อมูลหุ้น: " + symbol);
            }
            return ResponseEntity.ok(data);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @GetMapping("/admin/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            // เรียกใช้ Service ที่เราเพิ่งสร้าง
            List<Account> accounts = brokerService.getAllAccounts();
            return ResponseEntity.ok(accounts);
        } catch (Exception e) {
            log.error("Failed to fetch all users", e);
            return ResponseEntity.internalServerError().body("❌ Error fetching users: " + e.getMessage());
        }
    }

    @PostMapping("/create-account")
    public ResponseEntity<?> createNewAccount() {
        try {
            // เรียกใช้ method ที่คุณเขียนไว้ใน Service
            Account newAccount = brokerService.createAccount();

            // ส่งข้อมูล Account ที่สร้างเสร็จแล้วกลับไปให้คนเรียก
            return ResponseEntity.ok(newAccount);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error creating account: " + e.getMessage());
        }
    }
    @PostMapping("/admin/fund-firm")
    public ResponseEntity<?> fundFirmAccount(
            @RequestParam("amount") Double amount  // <-- รับค่าจาก URL Parameter
    ) {
        try {
            if (amount == null || amount <= 0) {
                return ResponseEntity.badRequest().body("❌ กรุณาระบุจำนวนเงิน (amount) ให้ถูกต้อง");
            }

            brokerService.addMoneyToFirmAccount(amount);

            return ResponseEntity.ok("✅ เติมเงินเข้าบริษัทสำเร็จ: $" + amount);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @PostMapping("/admin/fund-user")
    public ResponseEntity<?> fundUserAccount(
            @RequestParam("accountId") UUID accountId, // <-- รับ UUID จาก URL
            @RequestParam("amount") Double amount      // <-- รับจำนวนเงินจาก URL
    ) {
        try {
            if (amount == null || amount <= 0) {
                return ResponseEntity.badRequest().body("❌ กรุณาระบุจำนวนเงิน (amount) ให้ถูกต้อง");
            }

            brokerService.addMoneyToUserAccount(accountId, amount);

            return ResponseEntity.ok("✅ เติมเงินให้ User " + accountId + " สำเร็จ: $" + amount);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }
}
