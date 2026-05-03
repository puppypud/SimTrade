package com.alpaca.web.controller;

import com.alpaca.web.Repository.OrderHistoryRepository;
import com.alpaca.web.Service.*;
import com.alpaca.web.dto.*;
import com.alpaca.web.entity.OrderHistory;
import com.alpaca.web.entity.UserAccount;
import net.jacobpeterson.alpaca.openapi.broker.ApiException;
import net.jacobpeterson.alpaca.openapi.marketdata.model.*;
import org.slf4j.Logger;
import net.jacobpeterson.alpaca.openapi.broker.model.*; // Import ของ Alpaca
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.alpaca.web.Repository.AccountRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("broker")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost" })
public class BrokerController {

    private final Logger log = LoggerFactory.getLogger(BrokerController.class);
    private final BrokerService brokerService;
    private final MarketDataService marketDataService; // เพิ่มตัวแปร Service
    private final AccountRepository accountRepository;
    private final StockAnalysisService stockAnalysisService;
    private final OrderHistoryRepository orderHistoryRepository;
    private final StockImportService stockImportService;

    // เพิ่มใน Constructor ให้ Spring ส่งเข้ามาให้
    public BrokerController(BrokerService brokerService, MarketDataService marketDataService,
                            AccountRepository accountReapository, StockAnalysisService stockAnalysisService,
                            StockAnalysisService stockAnalysisService1, OrderHistoryRepository orderHistoryRepository, StockImportService stockImportService) {
        this.brokerService = brokerService;
        this.marketDataService = marketDataService;
        this.accountRepository = accountReapository;
        this.stockAnalysisService = stockAnalysisService1;
        this.orderHistoryRepository = orderHistoryRepository;
        this.stockImportService = stockImportService;
    }

    @PostMapping("/order/user") // รับได้2แบบ1.accountId(แก้ไข) หรือ 2. email แต่รับด้วย email
                                // เพื่อความปลอดภัยให้หน้าบ้านไม่รู้จักหลังบ้าน
    public ResponseEntity<?> buyStockForUser(
            @RequestParam("email") String email,
            @RequestParam("symbol") String symbol,
            @RequestParam(value = "qty", required = false) BigDecimal qty,
            @RequestParam(value = "notional", required = false) BigDecimal notional,
            @RequestParam(value = "limitPrice", required = false) BigDecimal limitPrice,
            @RequestParam(value = "stopPrice", required = false) BigDecimal stopPrice,
            @RequestParam("OrderSide") String orderSideStr,
            @RequestParam("OrderType") String orderTypeStr,
            @RequestParam("TimeInForce") String timeInForceStr) { // เอา throws Exception ออก แล้ว try-catch ข้างในแทน
        try {
            // mapping user กับ ใน database จาก email ที่ หน้าบ้านส่งมาเพื่อความปลอดภัย
            Optional<UserAccount> userOptional = accountRepository.findByEmail(email);
            if (userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("❌ ไม่พบข้อมูลผู้ใช้งานอีเมล: " + email);
            }

            String alpacaIdStr = userOptional.get().getAlpacaAccountId();
            UUID accountId = UUID.fromString(alpacaIdStr);

            // เช็คตลาดว่าอยู่ในโหมดปรับปรุงไหม (block เฉพาะ MAINTENANCE เท่านั้น)
            // ถ้าตลาดปิด → ปล่อยผ่านให้ Alpaca API ตัดสินเอง (Alpaca จะ queue หรือ reject
            // ตามกฎของมัน)
            Map<String, Object> marketStatus = marketDataService.getCurrentMaketStatus();
            String currentStatus = (String) marketStatus.get("status");

            if ("MAINTENANCE".equals(currentStatus)) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("❌ " + marketStatus.get("message"));
            }

            OrderSide side = OrderSide.valueOf(orderSideStr.toUpperCase());
            OrderType type = OrderType.valueOf(orderTypeStr.toUpperCase());
            TimeInForce Time = TimeInForce.valueOf(timeInForceStr.toUpperCase());

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
                    stopPrice);

            // 3. แจ้ง User ว่ารับคำสั่งแล้ว (สถานะจะเป็น NEW หรือ ACCEPTED)
            return ResponseEntity.ok(Map.of(
                    "message", "Order submitted successfully",
                    "orderId", order.getId(),
                    "status", order.getStatus(),
                    "symbol", order.getSymbol()));

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

            // อัปเดตสถานะใน database ของเราให้ตรงกับ Alpaca ทันทีที่การยกเลิกหน้าเว็บสำเร็จ
            java.util.Optional<com.alpaca.web.entity.OrderHistory> optOrder = orderHistoryRepository.findById(orderId);
            if (optOrder.isPresent()) {
                com.alpaca.web.entity.OrderHistory order = optOrder.get();
                order.setStatus("CANCELED");
                orderHistoryRepository.save(order);
                log.info("✅ Updated order status to CANCELED in DB for orderId: " + orderId);
            }

            return ResponseEntity.ok("order successfully cancelled" + orderId);
        } catch (Exception e) {
            log.error("error" + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ Cancellation Failed. Error: " + e.getMessage());
        }
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getSingleOrder(
            @RequestParam("accountId") UUID accountId,
            @PathVariable("orderId") String orderId) {

        try {
            // ดึงข้อมูลจาก Database โดยตรง
            Optional<OrderHistory> orderOpt = orderHistoryRepository.findById(orderId);

            if (orderOpt.isPresent()) {
                OrderHistory order = orderOpt.get();

                // เช็คความปลอดภัย: ตรวจสอบว่าออร์เดอร์นี้เป็นของ Account ID ที่ส่งมาจริงๆ
                // หรือไม่
                if (!order.getUserAccount().getAlpacaAccountId().equals(accountId.toString())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("❌ ไม่ได้รับอนุญาตให้ดูออร์เดอร์นี้");
                }

                return ResponseEntity.ok(order);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("❌ Order ID: " + orderId + " ไม่พบในฐานข้อมูลระบบ");
            }
        } catch (Exception e) {
            log.error("Error retrieving order {}", orderId, e);
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
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
            List<OrderHistory> orders = orderHistoryRepository
                    .findByUserAccount_AlpacaAccountIdOrderByCreatedAtDesc(accountId.toString());
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Failed to get all orders from database for account {}", accountId, e);
            return ResponseEntity.internalServerError()
                    .body("❌ Failed to retrieve orders from database. Error: " + e.getMessage());
        }

    }

    @GetMapping("/order/stock-bar")
    public ResponseEntity<?> getStockBar(
            @RequestParam("symbols") String symbols,
            @RequestParam("viewType") String viewType) {
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
            @PathVariable("accountId") UUID accountId) {
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
            // ดึงจาก api Alpaca มาตรงๆ
            /*
             * List<Account> accounts = brokerService.getAllAccounts();
             * return ResponseEntity.ok(accounts);
             */
            List<UserAccount> localAccounts = brokerService.getAllLocalUsers();
            return ResponseEntity.ok(localAccounts);

        } catch (Exception e) {
            log.error("Failed to fetch all users", e);
            return ResponseEntity.internalServerError().body("❌ Error fetching users: " + e.getMessage());
        }
    }

    @GetMapping("/admin/users-equity")
    public ResponseEntity<?> getAllUsersEquity() {
        try {
            log.info("Admin: Fetching bulk equity from Alpaca...");
            // ดึงจาก Alpaca
            List<Account> alpacaAccounts = brokerService.getAllAccounts();

            // สร้าง Map จับคู่ ID -> ยอดเงิน
            Map<String, Double> equityMap = new HashMap<>();

            for (Account acc : alpacaAccounts) {
                String accountIdStr = acc.getId().toString();
                Double equity = 0.0;
                if (acc.getLastEquity() != null) {
                    equity = acc.getLastEquity().doubleValue();
                }
                equityMap.put(accountIdStr, equity);
            }

            return ResponseEntity.ok(equityMap);
        } catch (Exception e) {
            log.error("Failed to fetch bulk equity", e);
            return ResponseEntity.internalServerError().body("❌ Error fetching equity: " + e.getMessage());
        }
    }

    @PostMapping("/create-account")
    public ResponseEntity<?> createAccount(@RequestBody CreateAccountRequest request) {
        try {
            // โยน DTO ไปให้ Service จัดการ
            UserAccount newAccount = brokerService.createAccount(request);
            return ResponseEntity.ok(newAccount);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/admin/fund-firm")
    public ResponseEntity<?> fundFirmAccount(
            @RequestParam("amount") Double amount // <-- รับค่าจาก URL Parameter
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
            @RequestParam("amount") Double amount) {
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
            @RequestParam("symbol") String symbol, // รับค่าเช่น "BTC" หรือ "ETH"
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
            @RequestParam(value = "stopPrice", required = false) BigDecimal stopPrice) {
        try {
            Map<String, Object> marketStatus = marketDataService.getCurrentMaketStatus();
            String currentStatus = (String) marketStatus.get("status");

            if ("MAINTENANCE".equals(currentStatus)) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("❌ " + marketStatus.get("message"));
            }

            OrderSide side = OrderSide.valueOf(orderSideStr.toUpperCase());
            // ✅ แปลง Enum
            OrderType type = OrderType.valueOf(orderTypeStr.toUpperCase());
            TimeInForce tif = TimeInForce.valueOf(timeInForceStr.toUpperCase());

            // ส่งค่าทั้งหมดไปให้ BrokerService สร้างออเดอร์
            Order order = brokerService.createCryptoOrder(
                    accountId, symbol, qty, notional, side, type, tif, limitPrice, stopPrice);
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

            if (data.isEmpty() || (data.containsKey("price") && (double) data.get("price") == 0)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ ไม่พบข้อมูล Crypto: " + symbol);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @GetMapping("/market/status")
    public ResponseEntity<?> getMarketStatus() {
        try {
            Map<String, Object> status = marketDataService.getCurrentMaketStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @PostMapping("/admin/market/maintenance")
    public ResponseEntity<?> toggleMaintenance(
            @RequestParam("active") boolean active,
            @RequestParam(value = "message", required = false) String message) {

        marketDataService.setMaintenanceMode(active, message);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "maintenanceActive", active,
                "message", "อัปเดตสถานะ Maintenance สำเร็จ"));
    }

    @GetMapping("/assets/search")
    public ResponseEntity<?> searchAssets(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "industry", required = false) String industry,
            @RequestParam(value = "sortBy", defaultValue = "symbol") String sortBy,
            @RequestParam(value = "direction", defaultValue = "asc") String direction) {

        log.info("Search Request: keyword={}, category={}, industry={}, sortBy={}, direction={}",
                keyword, category, industry, sortBy, direction);

        try {
            // ✅ เรียกใช้ระบบ Hybrid ที่เราทำไว้ใน MarketDataService
            List<StockSearchResultDTO> results = marketDataService.hybridSearchAndFilter(
                    keyword, category, industry, sortBy, direction
            );

            // ถ้าไม่เจอข้อมูลเลย
            if (results.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            return ResponseEntity.ok(results);

        } catch (Exception e) {
            log.error("❌ Failed to search assets: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error during search: " + e.getMessage());
        }
    }

    // ===== Advanced Filter Endpoint (ระบบกรองขั้นสูง) =====
    @PostMapping("/assets/filter")
    public ResponseEntity<?> filterStocks(@RequestBody StockSearchDto filterRequest) {
        log.info("📥 Filter Request received: {}", filterRequest);
        try {
            List<StockSearchResultDTO> results = marketDataService.filterStocks(filterRequest);

            if (results.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("❌ Failed to filter stocks: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error during filter: " + e.getMessage());
        }
    }

    @GetMapping("/assets/info")
    public ResponseEntity<?> getStockInfoDetail(@RequestParam("symbol") String symbol) {
        try {
            // 3. เรียกผ่านตัวแปร instance
            StockInfoDatabaseDTO info = stockAnalysisService.getStockInfo(symbol);

            if (info == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("❌ ไม่พบข้อมูลหุ้น: " + symbol + " ทั้งในระบบและแหล่งข้อมูลภายนอก");
            }

            return ResponseEntity.ok(info);

        } catch (Exception e) {
            // ... log error
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @GetMapping("/assets/recommended")
    public ResponseEntity<?> getRecommendedStocks(
            @RequestParam(value = "traderType", required = false, defaultValue = "Day Trader") String traderType) {
        try {
            List<String> recommended = stockAnalysisService.getRecommendedStocks(traderType);
            return ResponseEntity.ok(recommended);
        } catch (Exception e) {
            log.error("Error fetching recommended stocks", e);
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }

    @PostMapping("/user/onboarding")
    public ResponseEntity<?> submitOnboarding(@RequestBody OnboardingRequest request) {
        // 💡 เพิ่มบรรทัดนี้เพื่อปริ้นดูว่า Backend รับค่าอะไรมาบ้าง!
        System.out.println("📥 รับ Request Onboarding:");
        System.out.println("Email: " + request.getEmail());
        System.out.println("TraderType: " + request.getTraderType());
        System.out.println("RiskBehavior: " + request.getRiskBehavior());

        try {
            if (request.getEmail() == null || request.getEmail().isBlank()) {
                return ResponseEntity.badRequest().body("เกิดข้อผิดพลาด: ไม่พบ Email ในคำขอ");
            }

            // โยนเข้า Service ไปจัดการ
            brokerService.saveOnboardingData(request);
            return ResponseEntity.ok(Map.of("message", "บันทึกข้อมูล Onboarding สำเร็จ"));
        } catch (Exception e) {
            System.out.println("❌ Error: " + e.getMessage());
            return ResponseEntity.badRequest().body("เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "กรุณาระบุอีเมลและรหัสผ่าน"));
        }

        Optional<UserAccount> userOpt = accountRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        }

        UserAccount user = userOpt.get();
        // เทียบรหัสผ่านแบบข้อความธรรมดา (จากการตรวจสอบก่อนหน้านี้ว่าไม่มีการเข้ารหัส)
        if (!user.getPassword().equals(request.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        }

        // คืนค่าข้อมูลที่จำเป็นเพื่อนำไปเก็บใน Frontend Context (เช่น id และ
        // alpacaAccountId)
        // สร้าง Map เก็บข้อมูลผู้ใช้ (ใช้ HashMap เพราะ Map.of ไม่รับค่า null)
        Map<String, Object> responseData = new java.util.HashMap<>();
        responseData.put("id", user.getId());
        responseData.put("email", user.getEmail());
        responseData.put("firstName", user.getFirstName());
        responseData.put("lastName", user.getLastName());
        responseData.put("alpacaAccountId", user.getAlpacaAccountId());
        responseData.put("traderType", user.getTraderType() != null ? user.getTraderType() : "Unknown");
        return ResponseEntity.ok(responseData);
    }

    @PostMapping("/register")
    public ResponseEntity<UserAccount> register(@RequestBody CreateAccountRequest request) throws ApiException {
        // 1. สร้างบัญชีและบันทึกลง Database
        UserAccount newUser = brokerService.createAccount(request);

        // 2. สั่งโอนเงิน (ระบบจะแตะบรรทัดนี้แล้วปล่อยผ่านไปบรรทัดที่ 3 ทันที
        // ไม่รอโอนเสร็จเพราะมี @Async)
        log.info("📥 สมัครสมาชิกสำเร็จ สั่งงาน Background โอนเงินให้: {}", newUser.getEmail());
        brokerService.addMoneyToUserAccount(UUID.fromString(newUser.getAlpacaAccountId()), 100000.0);

        // 3. ตอบกลับหน้าบ้านทันที ให้ Frontend พา User เด้งไปหน้า Quiz ได้เลย
        return ResponseEntity.ok(newUser);
    }

    // ===== อัปเดตประเภทนักเทรดของผู้ใช้ (เปลี่ยนสาย) =====
    @PutMapping("/user/trader-type")
    public ResponseEntity<?> updateTraderType(@RequestParam String email, @RequestParam String traderType) {
        try {
            Optional<UserAccount> userOpt = accountRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "ไม่พบผู้ใช้ในระบบ"));
            }
            UserAccount user = userOpt.get();
            String oldType = String.valueOf(user.getTraderType());
            user.setTraderType(traderType);
            accountRepository.save(user);
            log.info("🔄 เปลี่ยนสายเทรด: {} จาก '{}' เป็น '{}'", email, oldType, traderType);
            return ResponseEntity.ok(Map.of(
                    "message", "เปลี่ยนสายเทรดสำเร็จ",
                    "traderType", traderType));
        } catch (Exception e) {
            log.error("❌ Error updating trader type: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", "เกิดข้อผิดพลาดในการเปลี่ยนสายเทรด"));
        }
    }

    //ADmin ดึงตัวหุ้นมาคำนวณเพื่อเพิ่มลง database
    @PostMapping("/import-stocks")
    public ResponseEntity<?> importStocks() {

        // 1. สั่งให้ Service ทำงานแบบ Async (รันเงียบๆ หลังบ้าน)
        stockImportService.importStocksToDatabase();

        // 2. ตอบกลับ Postman ทันที โดยไม่ต้องรอ 30 นาทีให้เสร็จ
        return ResponseEntity.ok(Map.of(
                "status", "Processing",
                "message", "🚀 เริ่มกระบวนการนำเข้าหุ้นจาก CSV แล้ว กรุณาตรวจสอบความคืบหน้าได้ที่หน้าจอ Console Log ของ Spring Boot"
        ));
    }
}
