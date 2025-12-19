package com.alpaca.web.controller;

import com.alpaca.web.Service.BrokerService;
import com.alpaca.web.Service.MarketDataService;
import net.jacobpeterson.alpaca.openapi.marketdata.model.*;
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
    private final BrokerService brokerService;
    private final MarketDataService marketDataService; // เพิ่มตัวแปร Service

    //เพิ่มใน Constructor ให้ Spring ส่งเข้ามาให้  ต
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
            @RequestParam("accountId") UUID accountId,
            @RequestParam("amount") Double amount
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

    @GetMapping("/order/crypto-bar")
    public ResponseEntity<?> getCryptoBar(
            @RequestParam("symbol") String symbol,  // รับค่าเช่น "BTC" หรือ "ETH"
            @RequestParam("viewType") String viewType // รับค่าเช่น "1D", "1W"
    ) {
        try {
            // เรียกใช้ method getCryptoBars ที่คุณเพิ่งเพิ่มใน MarketDataService
            List<StockBar> bars = marketDataService.getCryptoBars(symbol, viewType);

            if (bars.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("❌ ไม่พบข้อมูลกราฟสำหรับ Crypto: " + symbol);
            }
            return ResponseEntity.ok(bars);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("❌ Server Error: " + e.getMessage());
        }
    }
    // ใน BrokerController.java

    @PostMapping("/orders/crypto")
    public ResponseEntity<?> placeCryptoOrder(
            @RequestParam("accountId") UUID accountId,
            @RequestParam("symbol") String symbol,
            @RequestParam(value = "qty", required = false) BigDecimal qty,
            @RequestParam(value = "notional", required = false) BigDecimal notional,
            @RequestParam("OrderSide") String orderSideStr, // ยังต้องมี BUY/SELL
            // ❌ ตัด OrderType ออก (เดี๋ยวระบบเลือกให้เอง)
            @RequestParam(value = "limitPrice", required = false) BigDecimal limitPrice
    ) {
        try {
            // 1. แปลง OrderSide (BUY/SELL)
            OrderSide side = OrderSide.valueOf(orderSideStr.toUpperCase());
            // 2. Lock & Auto-Detect OrderType (ระบบเลือกให้อัตโนมัติ)
            OrderType type;
            if (notional != null) {
                // ถ้าซื้อเป็นจำนวนเงิน (Notional) -> บังคับ MARKET เท่านั้น
                type = OrderType.MARKET;
            } else {
                // ถ้าซื้อเป็นจำนวนเหรียญ (Qty)
                // มี Limit Price -> เป็น LIMIT, ไม่มี -> เป็น MARKET
                type = (limitPrice != null) ? OrderType.LIMIT : OrderType.MARKET;
            }
            // 3. ส่งเข้า Service (TimeInForce ถูก Lock เป็น GTC ใน Service แล้ว)
            Order order = brokerService.createCryptoOrder(
                    accountId,
                    symbol,
                    qty,
                    notional,
                    side,
                    type,
                    limitPrice
            );
            return ResponseEntity.ok(order);

        } catch (IllegalArgumentException e) {
            // ดัก Error เช่น ส่งมาทั้ง qty และ notional หรือ ใส่ enum ผิด
            return ResponseEntity.badRequest().body("❌ Validation Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
      @GetMapping("/quote/crypto")
    public ResponseEntity<?> getLatestCryptoQuote(@RequestParam("symbol") String symbol) {
        try {
            // เรียกใช้ Service ตัวที่เราเพิ่งแก้เสร็จ
            Map<String, Object> data = marketDataService.getLatestCryptoQuote(symbol);

            if (data.isEmpty() || (data.containsKey("price") && (double)data.get("price") == 0)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ ไม่พบข้อมูล Crypto: " + symbol);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }
}
