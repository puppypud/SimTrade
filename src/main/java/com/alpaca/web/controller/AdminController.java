package com.alpaca.web.controller;

import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.Repository.OrderHistoryRepository;
import com.alpaca.web.Repository.StockAssetRepository;
import com.alpaca.web.Service.BrokerService;
import com.alpaca.web.dto.AdminUpdateUserRequest;
import com.alpaca.web.dto.AdminAddStockRequest;
import com.alpaca.web.entity.OrderHistory;
import com.alpaca.web.entity.StockAsset;
import com.alpaca.web.entity.UserAccount;
import com.alpaca.web.corsconfig.RiskConfig;
import com.alpaca.web.entity.AnalysisData;
import com.alpaca.web.enums.TraderType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/broker/admin")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost"})
public class AdminController {

    private final Logger log = LoggerFactory.getLogger(AdminController.class);
    private final AccountRepository accountRepository;
    private final OrderHistoryRepository orderHistoryRepository;
    private final StockAssetRepository stockAssetRepository;
    private final BrokerService brokerService;

    public AdminController(AccountRepository accountRepository,
                           OrderHistoryRepository orderHistoryRepository,
                           StockAssetRepository stockAssetRepository,
                           BrokerService brokerService) {
        this.accountRepository = accountRepository;
        this.orderHistoryRepository = orderHistoryRepository;
        this.stockAssetRepository = stockAssetRepository;
        this.brokerService = brokerService;
    }

    // ============================================================
    // 1. USER MANAGEMENT
    // ============================================================

    /**
     * GET /broker/admin/users - ดึงผู้ใช้ทั้งหมด (มีอยู่แล้วใน BrokerController แต่ทำ alias ไว้)
     * ดูที่ BrokerController "/broker/admin/users"
     */

    /**
     * PUT /broker/admin/users/{userId} - แก้ไขข้อมูลผู้ใช้
     */
    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId,
                                        @RequestBody AdminUpdateUserRequest request) {
        try {
            UserAccount user = accountRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
                user.setFirstName(request.getFirstName());
            }
            if (request.getLastName() != null && !request.getLastName().isBlank()) {
                user.setLastName(request.getLastName());
            }
            if (request.getPhoneNumber() != null) {
                user.setPhoneNumber(request.getPhoneNumber());
            }
            if (request.getStatus() != null && !request.getStatus().isBlank()) {
                user.setStatus(request.getStatus());
            }
            if (request.getTraderType() != null && !request.getTraderType().isBlank()) {
                user.setTraderType(request.getTraderType());
            }
            if (request.getRiskBehavior() != null && !request.getRiskBehavior().isBlank()) {
                user.setRiskBehavior(request.getRiskBehavior());
            }

            accountRepository.save(user);
            log.info("✅ Admin updated user {}", userId);
            return ResponseEntity.ok(Map.of("message", "อัปเดตข้อมูลผู้ใช้สำเร็จ", "userId", userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error updating user {}", userId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "เกิดข้อผิดพลาดในการแก้ไขข้อมูล"));
        }
    }

    /**
     * DELETE /broker/admin/users/{userId} - ลบผู้ใช้ (soft delete: set status = INACTIVE)
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        try {
            UserAccount user = accountRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            // Soft delete — ปิดบัญชีแทนการลบ เพื่อรักษา History
            user.setStatus("INACTIVE");
            accountRepository.save(user);
            log.info("🗑️ Admin soft-deleted user {}", userId);
            return ResponseEntity.ok(Map.of("message", "ปิดบัญชีผู้ใช้สำเร็จ (Soft Delete)", "userId", userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting user {}", userId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "เกิดข้อผิดพลาดในการลบผู้ใช้"));
        }
    }

    /**
     * GET /broker/admin/users/{userId}/portfolio - ดูพอร์ตรายบุคคล (ดึงจาก Alpaca)
     */
    @GetMapping("/users/{userId}/portfolio")
    public ResponseEntity<?> getUserPortfolio(@PathVariable Long userId) {
        try {
            UserAccount user = accountRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            if (user.getAlpacaAccountId() == null) {
                return ResponseEntity.ok(Map.of("account", Map.of(), "positions", List.of()));
            }

            UUID alpacaId = UUID.fromString(user.getAlpacaAccountId());

            // ดึง Account Info (ยอดเงิน) และ Positions พร้อมกัน
            Object account = brokerService.getAccount(alpacaId);
            List<?> positions = brokerService.getPositions(alpacaId);

            // ดึงประวัติออเดอร์ของ User คนนี้
            List<OrderHistory> orders = orderHistoryRepository
                    .findByUserAccount_AlpacaAccountIdOrderByCreatedAtDesc(user.getAlpacaAccountId());

            Map<String, Object> result = new HashMap<>();
            result.put("user", Map.of(
                    "id", user.getId(),
                    "firstName", user.getFirstName(),
                    "lastName", user.getLastName(),
                    "email", user.getEmail(),
                    "traderType", user.getTraderType() != null ? user.getTraderType() : "Unknown",
                    "riskBehavior", user.getRiskBehavior() != null ? user.getRiskBehavior() : "Unknown"
            ));
            result.put("account", account);
            result.put("positions", positions);
            result.put("recentOrders", orders.stream().limit(20).collect(Collectors.toList()));

            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error fetching portfolio for user {}", userId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "ดึงข้อมูลพอร์ตไม่สำเร็จ: " + e.getMessage()));
        }
    }

    // ============================================================
    // 2. ORDER / TRANSACTION MANAGEMENT
    // ============================================================

    /**
     * GET /broker/admin/orders - ดึงธุรกรรมทั้งหมดในระบบ (พร้อม pagination)
     */
    @GetMapping("/orders")
    public ResponseEntity<?> getAllOrdersInSystem(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String side) {
        try {
            List<OrderHistory> allOrders = orderHistoryRepository.findAll(
                    org.springframework.data.domain.Sort.by("createdAt").descending()
            );

            // Filter
            List<OrderHistory> filtered = allOrders.stream()
                    .filter(o -> symbol == null || symbol.isBlank() || o.getSymbol().equalsIgnoreCase(symbol))
                    .filter(o -> status == null || status.isBlank() || status.equalsIgnoreCase("all") || o.getStatus().equalsIgnoreCase(status))
                    .filter(o -> side == null || side.isBlank() || side.equalsIgnoreCase("all") || o.getSide().equalsIgnoreCase(side))
                    .collect(Collectors.toList());

            int total = filtered.size();
            int fromIdx = Math.min(page * size, total);
            int toIdx = Math.min(fromIdx + size, total);
            List<OrderHistory> pageData = filtered.subList(fromIdx, toIdx);

            // Enrich with user info
            List<Map<String, Object>> enriched = pageData.stream().map(order -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", order.getOrderId());
                map.put("symbol", order.getSymbol());
                map.put("side", order.getSide());
                map.put("orderType", order.getType());
                map.put("status", order.getStatus());
                map.put("qty", order.getQty());
                map.put("filledQty", order.getFilledQty());
                map.put("filledAvgPrice", order.getFilledAvgPrice());
                map.put("commission", order.getCommission());
                map.put("limitPrice", order.getLimitPrice());
                map.put("notional", order.getNotional());
                map.put("submittedAt", order.getCreatedAt());
                map.put("filledAt", order.getFilledAt());
                map.put("timeInForce", order.getTimeInForce());
                map.put("assetClass", order.getAssetClass());

                // ข้อมูล User
                if (order.getUserAccount() != null) {
                    UserAccount u = order.getUserAccount();
                    map.put("userId", u.getId());
                    map.put("userEmail", u.getEmail());
                    map.put("userName", u.getFirstName() + " " + u.getLastName());
                    map.put("alpacaAccountId", u.getAlpacaAccountId());
                }
                return map;
            }).collect(Collectors.toList());

            // Summary statistics
            double totalCommission = filtered.stream()
                    .mapToDouble(o -> o.getCommission() != null ? o.getCommission().doubleValue() : 0)
                    .sum();
            double totalVolume = filtered.stream()
                    .mapToDouble(o -> {
                        if (o.getNotional() != null) return o.getNotional().doubleValue();
                        if (o.getFilledAvgPrice() != null && o.getFilledQty() != null)
                            return o.getFilledAvgPrice().doubleValue() * o.getFilledQty().doubleValue();
                        return 0;
                    })
                    .sum();

            long buyCount = filtered.stream().filter(o -> "BUY".equalsIgnoreCase(o.getSide())).count();
            long sellCount = filtered.stream().filter(o -> "SELL".equalsIgnoreCase(o.getSide())).count();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("data", enriched);
            response.put("total", total);
            response.put("page", page);
            response.put("size", size);
            response.put("summary", Map.of(
                    "totalCommission", totalCommission,
                    "totalVolume", totalVolume,
                    "buyCount", buyCount,
                    "sellCount", sellCount
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching all orders", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "ดึงข้อมูลธุรกรรมไม่สำเร็จ"));
        }
    }

    /**
     * POST /broker/admin/orders/{orderId}/cancel - Admin ยกเลิกออเดอร์ของผู้ใช้
     */
    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<?> adminCancelOrder(@PathVariable String orderId) {
        try {
            Optional<OrderHistory> orderOpt = orderHistoryRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "ไม่พบออเดอร์ ID: " + orderId));
            }

            OrderHistory order = orderOpt.get();

            // ตรวจสอบว่าออเดอร์ยังยกเลิกได้ไหม (เฉพาะ PENDING, NEW, ACCEPTED, LIMIT, STOP orders)
            String currentStatus = order.getStatus();
            if ("FILLED".equalsIgnoreCase(currentStatus) || "CANCELED".equalsIgnoreCase(currentStatus) || "EXPIRED".equalsIgnoreCase(currentStatus)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "ไม่สามารถยกเลิกออเดอร์ที่มีสถานะ " + currentStatus + " ได้"));
            }

            // ยกเลิกใน Alpaca ด้วยถ้า User มี alpacaAccountId
            UserAccount user = order.getUserAccount();
            if (user != null && user.getAlpacaAccountId() != null) {
                try {
                    brokerService.cancelOrderForAccount(UUID.fromString(user.getAlpacaAccountId()), orderId);
                } catch (Exception alpacaEx) {
                    log.warn("Failed to cancel in Alpaca (may already be done): {}", alpacaEx.getMessage());
                    // ไม่ throw — ถ้า Alpaca error เราก็แค่ update local DB
                }
            }

            // อัปเดตสถานะใน local DB
            order.setStatus("CANCELED");
            orderHistoryRepository.save(order);

            log.info("✅ Admin canceled order {}", orderId);
            return ResponseEntity.ok(Map.of("message", "ยกเลิกออเดอร์สำเร็จ", "orderId", orderId));
        } catch (Exception e) {
            log.error("Error canceling order {}", orderId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "ยกเลิกออเดอร์ไม่สำเร็จ: " + e.getMessage()));
        }
    }

    // ============================================================
    // 3. STOCK LIST MANAGEMENT
    // ============================================================

    /**
     * GET /broker/admin/stocks - ดึงหุ้นทั้งหมด (รวมที่ปิดไว้ด้วย)
     */
    @GetMapping("/stocks")
    public ResponseEntity<?> getAllStocks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String assetClass,
            @RequestParam(defaultValue = "symbol") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {
        try {
            List<StockAsset> all = stockAssetRepository.findAll();

            List<StockAsset> filtered = all.stream()
                    .filter(s -> keyword == null || keyword.isBlank()
                            || s.getSymbol().toLowerCase().contains(keyword.toLowerCase())
                            || (s.getName() != null && s.getName().toLowerCase().contains(keyword.toLowerCase())))
                    .filter(s -> category == null || category.isBlank() || category.equalsIgnoreCase(s.getCategory()))
                    .filter(s -> assetClass == null || assetClass.isBlank() || assetClass.equalsIgnoreCase(s.getAssetClass()))
                    .sorted((a, b) -> {
                        int cmp = 0;
                        switch (sortBy.toLowerCase()) {
                            case "name" -> cmp = Comparator.comparing(StockAsset::getName, Comparator.nullsLast(String::compareTo)).compare(a, b);
                            case "category" -> cmp = Comparator.comparing(StockAsset::getCategory, Comparator.nullsLast(String::compareTo)).compare(a, b);
                            default -> cmp = a.getSymbol().compareToIgnoreCase(b.getSymbol());
                        }
                        return "desc".equalsIgnoreCase(direction) ? -cmp : cmp;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("data", filtered, "total", filtered.size()));
        } catch (Exception e) {
            log.error("Error fetching stocks", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "ดึงข้อมูลหุ้นไม่สำเร็จ"));
        }
    }

    /**
     * POST /broker/admin/stocks - เพิ่มหุ้นใหม่เข้าระบบ
     */
    @PostMapping("/stocks")
    public ResponseEntity<?> addStock(@RequestBody AdminAddStockRequest request) {
        try {
            if (request.getSymbol() == null || request.getSymbol().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "กรุณาระบุ Symbol"));
            }
            if (request.getName() == null || request.getName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "กรุณาระบุชื่อบริษัท (Name)"));
            }

            String symbol = request.getSymbol().toUpperCase().trim();

            // ตรวจว่ามีอยู่แล้วหรือเปล่า
            if (stockAssetRepository.existsById(symbol)) {
                // ถ้ามีอยู่แล้ว ให้ re-enable แทน
                StockAsset existing = stockAssetRepository.findById(symbol).get();
                existing.setTradable(true);
                existing.setName(request.getName() != null ? request.getName() : existing.getName());
                existing.setCategory(request.getCategory() != null ? request.getCategory() : existing.getCategory());
                existing.setIndustry(request.getIndustry() != null ? request.getIndustry() : existing.getIndustry());
                stockAssetRepository.save(existing);
                return ResponseEntity.ok(Map.of("message", "เปิดให้ซื้อขายหุ้น " + symbol + " สำเร็จ (re-enabled)", "stock", existing));
            }

            StockAsset newStock = new StockAsset();
            newStock.setSymbol(symbol);
            newStock.setName(request.getName());
            newStock.setAssetClass(request.getAssetClass() != null ? request.getAssetClass() : "US_EQUITY");
            newStock.setCategory(request.getCategory());
            newStock.setIndustry(request.getIndustry());
            newStock.setTradable(true);
            if (request.getBeta() != null) newStock.setBeta(BigDecimal.valueOf(request.getBeta()));
            if (request.getMarketCap() != null) newStock.setMarketCap(request.getMarketCap());
            if (request.getAvgVolume() != null) newStock.setAvgVolume(request.getAvgVolume());

            stockAssetRepository.save(newStock);
            log.info("✅ Admin added stock {}", symbol);
            return ResponseEntity.ok(Map.of("message", "เพิ่มหุ้น " + symbol + " สำเร็จ", "stock", newStock));
        } catch (Exception e) {
            log.error("Error adding stock", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "เพิ่มหุ้นไม่สำเร็จ: " + e.getMessage()));
        }
    }

    /**
     * PUT /broker/admin/stocks/{symbol} - แก้ไขข้อมูลหุ้น (category, industry, isTradable)
     */
    @PutMapping("/stocks/{symbol}")
    public ResponseEntity<?> updateStock(@PathVariable String symbol,
                                         @RequestBody AdminAddStockRequest request) {
        try {
            String sym = symbol.toUpperCase();
            StockAsset stock = stockAssetRepository.findById(sym)
                    .orElseThrow(() -> new RuntimeException("ไม่พบหุ้น: " + sym));

            if (request.getName() != null && !request.getName().isBlank()) stock.setName(request.getName());
            if (request.getCategory() != null) stock.setCategory(request.getCategory());
            if (request.getIndustry() != null) stock.setIndustry(request.getIndustry());
            if (request.getIsTradable() != null) stock.setTradable(request.getIsTradable());
            if (request.getBeta() != null) stock.setBeta(BigDecimal.valueOf(request.getBeta()));
            if (request.getMarketCap() != null) stock.setMarketCap(request.getMarketCap());
            if (request.getAvgVolume() != null) stock.setAvgVolume(request.getAvgVolume());

            stockAssetRepository.save(stock);
            log.info("✅ Admin updated stock {}", sym);
            return ResponseEntity.ok(Map.of("message", "อัปเดตหุ้น " + sym + " สำเร็จ", "stock", stock));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error updating stock {}", symbol, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "แก้ไขหุ้นไม่สำเร็จ"));
        }
    }

    /**
     * DELETE /broker/admin/stocks/{symbol} - ลบหุ้นออกจากระบบ (soft delete: set isTradable = false)
     */
    @DeleteMapping("/stocks/{symbol}")
    public ResponseEntity<?> removeStock(@PathVariable String symbol) {
        try {
            String sym = symbol.toUpperCase();
            StockAsset stock = stockAssetRepository.findById(sym)
                    .orElseThrow(() -> new RuntimeException("ไม่พบหุ้น: " + sym));

            stock.setTradable(false);
            stockAssetRepository.save(stock);

            log.info("🗑️ Admin disabled stock {}", sym);
            return ResponseEntity.ok(Map.of("message", "ปิดการซื้อขายหุ้น " + sym + " สำเร็จ"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error removing stock {}", symbol, e);
            return ResponseEntity.internalServerError().body(Map.of("error", "ลบหุ้นไม่สำเร็จ"));
        }
    }

    // ============================================================
    // 4. DASHBOARD STATS (Volume, Behavior)
    // ============================================================

    /**
     * GET /broker/admin/dashboard/stats - ข้อมูลสรุปสำหรับ Dashboard
     */
    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            List<OrderHistory> allOrders = orderHistoryRepository.findAll();
            List<UserAccount> allUsers = accountRepository.findAll();

            // Volume & Commission
            double totalVolume = allOrders.stream().mapToDouble(o -> {
                if (o.getNotional() != null) return o.getNotional().doubleValue();
                if (o.getFilledAvgPrice() != null && o.getFilledQty() != null)
                    return o.getFilledAvgPrice().doubleValue() * o.getFilledQty().doubleValue();
                return 0;
            }).sum();

            double totalCommission = allOrders.stream()
                    .mapToDouble(o -> o.getCommission() != null ? o.getCommission().doubleValue() : 0)
                    .sum();

            // Order side breakdown
            long buyOrders = allOrders.stream().filter(o -> "BUY".equalsIgnoreCase(o.getSide())).count();
            long sellOrders = allOrders.stream().filter(o -> "SELL".equalsIgnoreCase(o.getSide())).count();

            // Status breakdown
            Map<String, Long> statusBreakdown = allOrders.stream()
                    .collect(Collectors.groupingBy(o -> o.getStatus() != null ? o.getStatus() : "UNKNOWN", Collectors.counting()));

            // Asset class breakdown
            Map<String, Long> assetClassBreakdown = allOrders.stream()
                    .collect(Collectors.groupingBy(o -> o.getAssetClass() != null ? o.getAssetClass() : "US_EQUITY", Collectors.counting()));

            // Daily volume (last 14 days)
            Map<String, Double> dailyVolume = new TreeMap<>();
            allOrders.forEach(o -> {
                String dateStr = o.getCreatedAt() != null
                        ? o.getCreatedAt().toString().substring(0, 10)
                        : "unknown";
                double vol = 0;
                if (o.getNotional() != null) vol = o.getNotional().doubleValue();
                else if (o.getFilledAvgPrice() != null && o.getFilledQty() != null)
                    vol = o.getFilledAvgPrice().doubleValue() * o.getFilledQty().doubleValue();
                dailyVolume.merge(dateStr, vol, Double::sum);
            });

            // Trader type distribution (User behavior)
            Map<String, Long> traderTypeDistribution = allUsers.stream()
                    .collect(Collectors.groupingBy(u -> u.getTraderType() != null ? u.getTraderType() : "Unknown", Collectors.counting()));

            // Risk behavior distribution
            Map<String, Long> riskBehaviorDistribution = allUsers.stream()
                    .collect(Collectors.groupingBy(u -> u.getRiskBehavior() != null ? u.getRiskBehavior() : "Unknown", Collectors.counting()));

            // Top traded symbols
            Map<String, Long> symbolCount = allOrders.stream()
                    .collect(Collectors.groupingBy(OrderHistory::getSymbol, Collectors.counting()));
            List<Map<String, Object>> topSymbols = symbolCount.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(10)
                    .map(e -> Map.<String, Object>of("symbol", e.getKey(), "count", e.getValue()))
                    .collect(Collectors.toList());

            // User status breakdown
            Map<String, Long> userStatusBreakdown = allUsers.stream()
                    .collect(Collectors.groupingBy(u -> u.getStatus() != null ? u.getStatus() : "UNKNOWN", Collectors.counting()));

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("totalOrders", allOrders.size());
            result.put("totalVolume", totalVolume);
            result.put("totalCommission", totalCommission);
            result.put("totalUsers", allUsers.size());
            result.put("buyOrders", buyOrders);
            result.put("sellOrders", sellOrders);
            result.put("statusBreakdown", statusBreakdown);
            result.put("assetClassBreakdown", assetClassBreakdown);
            result.put("dailyVolume", dailyVolume);
            result.put("traderTypeDistribution", traderTypeDistribution);
            result.put("riskBehaviorDistribution", riskBehaviorDistribution);
            result.put("topSymbols", topSymbols);
            result.put("userStatusBreakdown", userStatusBreakdown);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error fetching dashboard stats", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "ดึงข้อมูล Dashboard ไม่สำเร็จ"));
        }
    }

    // ============================================================
    // 5. ANALYSIS LOGIC & CRITERIA CONFIGURATION
    // ============================================================

    /**
     * GET /broker/admin/configs/risk - ดึงข้อมูลเกณฑ์ความเสี่ยงทั้งหมด
     */
    @GetMapping("/configs/risk")
    public ResponseEntity<?> getAllRiskConfigs() {
        Map<TraderType, RiskConfig> allConfigs = new HashMap<>();
        for (TraderType type : TraderType.values()) {
            allConfigs.put(type, RiskConfig.getConfig(type));
        }
        return ResponseEntity.ok(allConfigs);
    }

    /**
     * PUT /broker/admin/configs/risk/{traderType} - อัปเดตเกณฑ์ความเสี่ยงตามประเภทนักเทรด
     */
    @PutMapping("/configs/risk/{traderType}")
    public ResponseEntity<?> updateRiskConfig(@PathVariable String traderType, @RequestBody RiskConfig request) {
        try {
            TraderType type = TraderType.valueOf(traderType.toUpperCase());
            RiskConfig.updateConfig(type, request);
            
            log.info("✅ Admin updated risk config for {}", type);
            return ResponseEntity.ok(Map.of("message", "อัปเดตเกณฑ์ความเสี่ยงสำเร็จ", "config", request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid Trader Type"));
        } catch (Exception e) {
            log.error("Error updating risk config", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "อัปเดตเกณฑ์ความเสี่ยงไม่สำเร็จ"));
        }
    }

    /**
     * GET /broker/admin/configs/feedback - ดึงข้อมูลข้อความแจ้งเตือนทั้งหมด
     */
    @GetMapping("/configs/feedback")
    public ResponseEntity<?> getAllFeedbackTemplates() {
        return ResponseEntity.ok(AnalysisData.feedbackConfig);
    }

    /**
     * PUT /broker/admin/configs/feedback/{id} - อัปเดตข้อความแจ้งเตือน
     * (id ในที่นี้คือ alertType เช่น FOMO_ALERT)
     */
    @PutMapping("/configs/feedback/{id}")
    public ResponseEntity<?> updateFeedbackTemplate(@PathVariable String id, @RequestBody AnalysisData.FeedbackTemplateDTO request) {
        try {
            if (!AnalysisData.feedbackConfig.containsKey(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Template not found: " + id));
            }
            
            AnalysisData.FeedbackTemplateDTO template = AnalysisData.feedbackConfig.get(id);
            if (request.title != null) template.title = request.title;
            if (request.message != null) template.message = request.message;
            if (request.severity != null) template.severity = request.severity;
            
            AnalysisData.feedbackConfig.put(id, template);
            
            log.info("✅ Admin updated feedback template ID {}", id);
            return ResponseEntity.ok(Map.of("message", "อัปเดตข้อความแจ้งเตือนสำเร็จ", "template", template));
        } catch (Exception e) {
            log.error("Error updating feedback template", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "อัปเดตข้อความแจ้งเตือนไม่สำเร็จ"));
        }
    }
}
