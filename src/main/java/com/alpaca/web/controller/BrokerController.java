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
import java.math.RoundingMode;
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
            @RequestParam(value = "qty", required = false) BigDecimal qty,
            @RequestParam(value = "notional", required = false) BigDecimal notional,
            @RequestParam(value = "limitPrice", required = false) BigDecimal limitPrice,
            @RequestParam(value = "stopPrice", required = false) BigDecimal stopPrice,
            @RequestParam("OrderSide") String orderSideStr,
            @RequestParam("OrderType") String orderTypeStr,
            @RequestParam("TimeInForce") String timeInForceStr) { // เอา throws Exception ออก แล้ว try-catch ข้างในแทน
        try {
            // 1. เช็คสภาพคล่อง (Logic เดิมของคุณ ดีแล้วครับ) ✅
            Map<String, Object> quote = marketDataService.getLatestQuote(symbol);
            if (OrderSide.valueOf(orderSideStr) == OrderSide.BUY && OrderType.valueOf(orderTypeStr) == OrderType.MARKET) {
                if (quote.containsKey("askPrice")) {
                    double currentAsk = Double.parseDouble(quote.get("askPrice").toString());
                    if (currentAsk == 0) {
                        return ResponseEntity.badRequest().body("❌ ไม่สามารถซื้อได้ในขณะนี้ (ไม่มีสภาพคล่อง/ตลาดปิด)");
                    }
                }
            }

            OrderSide side = OrderSide.valueOf(orderSideStr);
            OrderType type = OrderType.valueOf(orderTypeStr);
            TimeInForce Time = TimeInForce.valueOf(timeInForceStr);

            log.info("Order Request: Account={} Symbol={} Side={} Type={}", accountId, symbol, side, type);

            // 2. ส่งคำสั่งสร้าง Order ✅
            Order order = brokerService.createOrder(
                    accountId,
                    symbol.toUpperCase(),
                    qty,
                    notional,
                    side,
                    type,
                    Time,
                    limitPrice,
                    stopPrice
            );

            // ❌ ลบ Logic การคิดเงินและหักค่าธรรมเนียมตรงนี้ออกให้หมด! ❌
            // เพราะหน้าที่นี้เป็นของ SSE Listener (BrokerService.java) ที่จะทำงานเมื่อ Order Fill จริงๆ

            // 3. แจ้ง User ว่ารับคำสั่งแล้ว (สถานะจะเป็น NEW หรือ ACCEPTED)
            return ResponseEntity.ok(Map.of(
                    "message", "Order submitted successfully",
                    "orderId", order.getId(),
                    "status", order.getStatus(),
                    "symbol", order.getSymbol()
            ));

        } catch (IllegalArgumentException e) {
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
            for (Order order : orders) {
                // เช็คว่า Order นี้มีการซื้อขายจริงไหม (มีราคาและจำนวนที่ Fill แล้ว)
                if (order.getFilledAvgPrice() != null && order.getFilledQty() != null) {

                    // คำนวณยอดรวม: ราคาเฉลี่ย x จำนวนที่ได้
                    BigDecimal totalCost = order.getFilledAvgPrice().multiply(order.getFilledQty());

                    // คำนวณ Fee 2.5%
                    BigDecimal fee = totalCost.multiply(BigDecimal.valueOf(0.025));

                    // ปัดเศษให้เหลือ 2 ตำแหน่ง (กันทศนิยมยาวเกิน)
                    fee = fee.setScale(2, RoundingMode.HALF_UP);

                    // ✅ ยัดไส้ค่า Fee ลงไปในช่อง 'commission' ของ Object เลย
                    order.setCommission(fee);
                }
            }
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
            @RequestParam("OrderSide") String orderSideStr,
            // ✅ เพิ่ม Parameter ใหม่
            @RequestParam(value = "OrderType", defaultValue = "MARKET") String orderTypeStr,
            @RequestParam(value = "TimeInForce", defaultValue = "GTC") String timeInForceStr,
            @RequestParam(value = "limitPrice", required = false) BigDecimal limitPrice,
            @RequestParam(value = "stopPrice", required = false) BigDecimal stopPrice
    ) {
        try {
            OrderSide side = OrderSide.valueOf(orderSideStr.toUpperCase());
            // ✅ แปลง Enum
            OrderType type = OrderType.valueOf(orderTypeStr.toUpperCase());
            TimeInForce tif = TimeInForce.valueOf(timeInForceStr.toUpperCase());

            // ส่งค่าทั้งหมดไปให้ BrokerService สร้างออเดอร์
            Order order = brokerService.createCryptoOrder(
                    accountId, symbol, qty, notional, side, type, tif, limitPrice, stopPrice
            );
            return ResponseEntity.ok(order);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error: " + e.getMessage());
        }
    }
      @GetMapping("/quote/crypto")
    public ResponseEntity<?> getLatestCryptoQuote(@RequestParam("symbol") String symbol) {
        try {
            // เรียกใช้ Service ตัวที่เราเพิ่งแก้เสร็จ
            Map<String, Object> data = marketDataService.getLatestQuote(symbol);

            if (data.isEmpty() || (data.containsKey("price") && (double)data.get("price") == 0)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ ไม่พบข้อมูล Crypto: " + symbol);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }
}
