package com.alpaca.web.Service;

import com.alpaca.web.Repository.AccountRepository;
import com.alpaca.web.Repository.OrderHistoryRepository;
import com.alpaca.web.dto.CreateAccountRequest;
import com.alpaca.web.dto.OnboardingRequest;
import com.alpaca.web.entity.OrderHistory;
import com.alpaca.web.entity.UserAccount;
import com.alpaca.web.entity.UserBalance;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType;

import net.jacobpeterson.alpaca.rest.broker.events.EventsApiSSE;
import net.jacobpeterson.alpaca.util.sse.SSEListener;
import net.jacobpeterson.alpaca.openapi.broker.model.TradeUpdateEventV2;
import net.jacobpeterson.alpaca.openapi.broker.model.Order;

import net.jacobpeterson.alpaca.openapi.broker.ApiException;
import net.jacobpeterson.alpaca.openapi.broker.model.*;
import net.jacobpeterson.alpaca.openapi.broker.model.CreateTransferRequest;
import net.jacobpeterson.alpaca.openapi.broker.model.OrderSide;
import net.jacobpeterson.alpaca.openapi.broker.model.OrderType;
import net.jacobpeterson.alpaca.openapi.broker.model.TimeInForce;
import net.jacobpeterson.alpaca.openapi.broker.model.Transfer;
import net.jacobpeterson.alpaca.openapi.broker.model.Account;
import net.jacobpeterson.alpaca.openapi.broker.model.Agreement;
import net.jacobpeterson.alpaca.openapi.broker.model.Contact;
import net.jacobpeterson.alpaca.openapi.broker.model.TransferType; // แยกไฟล์
import net.jacobpeterson.alpaca.openapi.broker.model.TransferDirection; // แยกไฟล์
import net.jacobpeterson.alpaca.openapi.broker.model.TransferTiming;
import net.jacobpeterson.alpaca.openapi.broker.model.AccountCreationRequest; // ต้องมีตัวนี้
import net.jacobpeterson.alpaca.openapi.broker.model.CreateOrderRequest; // ต้องมีตัวนี้
import net.jacobpeterson.alpaca.openapi.broker.model.Disclosures;
import net.jacobpeterson.alpaca.openapi.broker.model.Identity;
import net.jacobpeterson.alpaca.openapi.broker.model.TaxIdType;
import net.jacobpeterson.alpaca.openapi.broker.model.CreateJournalRequest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class BrokerService {
    Dotenv dotenv = Dotenv.load();
    private AlpacaAPI brokerAPI;

    private final OrderHistoryRepository orderHistoryRepository;
    private final AccountRepository accountRepository;
    private static final BigDecimal FEE_RATE = new BigDecimal("0.00025"); // 0.025% ///แก้ไขตรงนี้
    private static final BigDecimal FEE_MULTIPLIER = BigDecimal.ONE.add(FEE_RATE); // 1.00025 สำหรับไว้หารยอด Notional
    private final BehavioralAnalyticsService behavioralAnalyticsService;
    private final MarketDataService marketDataService;

    public BrokerService(OrderHistoryRepository orderHistoryRepository, AccountRepository accountRepository, 
                        BalanceLogService balanceLogService, OrderManagementService orderManagementService,
                        BehavioralAnalyticsService behavioralAnalyticsService, MarketDataService marketDataService) {
        this.orderHistoryRepository = orderHistoryRepository;
        this.accountRepository = accountRepository;
        this.balanceLogService = balanceLogService;
        this.orderManagementService = orderManagementService;
        this.behavioralAnalyticsService = behavioralAnalyticsService;
        this.marketDataService = marketDataService;
    }

    @PostConstruct
    public void init() {
        String brokerApiKey = dotenv.get("BROKER_API_KEY");
        String brokerApiSecret = dotenv.get("BROKER_API_SECRET");
        this.brokerAPI = new AlpacaAPI(brokerApiKey, brokerApiSecret, BrokerAPIEndpointType.SANDBOX);
        log.info("Alpaca Broker API Initialized");
        try {
            EventsApiSSE eventsApi = brokerAPI.broker().events();

            // Subscribe รอฟัง Trade Update
            eventsApi.subscribeToTradeV2(null, null, null, null, new SSEListener<TradeUpdateEventV2>() {
                @Override
                public void onOpen() {
                    log.info("✅ Broker SSE (V2) Connection Opened.");
                }

                @Override
                public void onClose() {
                    log.info("⚠️ Broker SSE (V2) Connection Closed.");
                }

                @Override
                public void onError(Throwable throwable, Response response) {
                    // ถ้าเจอ 410 อีก แสดงว่า API เปลี่ยน หรือ Key ผิด แต่ใช้ V2 น่าจะหายแล้ว
                    log.error("❌ SSE Error: {}", (throwable != null ? throwable.getMessage() : "Unknown Error"));
                    if (response != null) {
                        log.error("Response: Code={}, Message={}", response.code(), response.message());
                    }
                }

                @Override
                public void onMessage(TradeUpdateEventV2 message) {
                    processTradeUpdate(message);
                }
            });

            log.info("✅ Broker SSE Connected: Listening for trade updates...");

        } catch (Exception e) {
            log.error("❌ Failed to connect to Broker Events", e);
        }
    }

    // แยก Logic ออกมาเพื่อความสะอาด เอาไว้ update เมื่อ กดซื้อ order โดยเปลี่ยนจาก
    // new เป็น fill พวกนี้
    private void processTradeUpdate(TradeUpdateEventV2 tradeUpdate) {

        // เช็คว่าเป็น Event "fill" (ซื้อขายสำเร็จ) หรือไม่
        if (tradeUpdate.getEvent() != null && "fill".equalsIgnoreCase(tradeUpdate.getEvent().toString())) {
            try {
                Order order = tradeUpdate.getOrder();
                if (order == null || order.getId() == null) {
                    log.warn("⚠️ Received fill event but Order object or ID is null");
                    return;
                }
                String orderId = order.getId().toString();

                if (order.getClientOrderId() != null) {
                    try {
                        // 1. ดึง Account ID ออกมาก่อนเพื่อเตรียมใช้งาน
                        String rawId = order.getClientOrderId();
                        String realAccountIdString = rawId.length() >= 36 ? rawId.substring(0, 36) : rawId;
                        UUID accountId = UUID.fromString(realAccountIdString);

                        // 2. คำนวณค่าธรรมเนียม (ย้ายขึ้นมาทำก่อนเซฟ DB)
                        BigDecimal fee = BigDecimal.ZERO;
                        if (tradeUpdate.getPrice() != null && tradeUpdate.getQty() != null) {
                            BigDecimal filledPrice = new BigDecimal(tradeUpdate.getPrice().toString());
                            BigDecimal qty = new BigDecimal(tradeUpdate.getQty().toString());
                            BigDecimal totalCost = filledPrice.multiply(qty);
                            fee = totalCost.multiply(FEE_RATE).setScale(4, RoundingMode.HALF_UP);
                        } else {
                            log.warn("⚠️ Price or Qty is missing in TradeUpdate for Order: {}", orderId);
                        }

                        // 3. เริ่มกระบวนการตรวจสอบและบันทึก DB (Upsert)
                        Optional<OrderHistory> existingOrderOpt = orderHistoryRepository.findById(orderId);
                        OrderHistory historyToSave;

                        if (existingOrderOpt.isPresent()) {
                            historyToSave = existingOrderOpt.get();

                            // เช็คเพื่อป้องกันการหักเงินซ้ำ (Idempotency)
                            if ("FILLED".equalsIgnoreCase(historyToSave.getStatus())) {
                                log.info("ℹ️ Order {} is already FILLED. Skipping to prevent duplicate fee deduction.",
                                        orderId);
                                return;
                            }
                            log.info("ℹ️ Found existing order {}, updating to FILLED.", orderId);

                        } else {
                            // ⚠️ ถ้าหาไม่เจอ (เกิด Race Condition) ให้ "สร้างใหม่" รอไว้เลย
                            log.warn(
                                    "⚠️ Order {} not found in DB yet (Race Condition). Creating a new filled record ahead of time.",
                                    orderId);
                            historyToSave = new OrderHistory();
                            historyToSave.setOrderId(orderId);
                            historyToSave.setSymbol(order.getSymbol());
                            historyToSave.setSide(order.getSide() != null ? order.getSide().name() : null);
                            historyToSave.setType(order.getOrderType() != null ? order.getOrderType().name() : null);

                            historyToSave
                                    .setAssetClass(order.getAssetClass() != null ? order.getAssetClass().name() : null);
                            historyToSave.setQty(order.getQty());
                            historyToSave.setNotional(order.getNotional());
                            historyToSave.setLimitPrice(order.getLimitPrice());
                            if (order.getCreatedAt() != null) {
                                historyToSave.setCreatedAt(order.getCreatedAt().toInstant());
                            }

                            // เอา UserAccount มาผูกให้ครบ
                            accountRepository.findByAlpacaAccountId(accountId.toString())
                                    .ifPresent(historyToSave::setUserAccount);
                        }

                        // 4. หักเงินค่าธรรมเนียม
                        if (fee.compareTo(BigDecimal.ZERO) > 0) {
                            collectTradingFee(accountId, fee);
                            log.info("✅ Auto-Deduct Fee Success: Order {} | Account {} | Fee ${}", orderId, accountId,
                                    fee);
                        }

                        // 5. อัปเดตข้อมูลให้ครบถ้วนก่อนเซฟ
                        historyToSave.setStatus(order.getStatus() != null ? order.getStatus().name() : "FILLED");
                        historyToSave.setFilledQty(order.getFilledQty());
                        historyToSave.setFilledAvgPrice(order.getFilledAvgPrice());
                        historyToSave.setCommission(fee); // ✅ ใส่ค่า Commission ลง Object แล้ว!

                        if (order.getFilledAt() != null) {
                            historyToSave.setFilledAt(order.getFilledAt().toInstant());
                        }

                        // 6. บันทึกลง Database (บรรทัดเดียวจบ)
                        orderHistoryRepository.save(historyToSave);
                        log.info("✅ Database Updated: Order {} is now FILLED with commission.", orderId);

                        //7. บันทึก balance หรือ กระเป๋าเงิน user
                        try {
                            orderManagementService.processOrderFill(historyToSave, accountId, orderId);
                        } catch (Exception e) {
                            log.error("❌ OrderManagementService failed for order {}: {}", orderId, e.getMessage());
                        }


                    } catch (IllegalArgumentException e) {
                        log.warn("⚠️ Client Order ID is not a valid UUID: {}", order.getClientOrderId());
                    }
                } else {
                    log.warn("⚠️ Trade Update received but no Client Order ID found. Order: {}", orderId);
                }

            } catch (Exception e) {
                log.error("❌ Error processing fee for trade update", e);
            }
        }
    }

    public AlpacaAPI getApi() {
        return this.brokerAPI;
    }

    private static final Logger log = LoggerFactory.getLogger(BrokerService.class);

    // ข้อมูลบัญชีบริษัท (Firm Account)
    private static final String FIRM_ACCOUNT_ID = "f34e892f-10ab-3c84-810f-bcbb24f5b975"; // UUID (ใช้ตอนโอน Journal)
    private static final String FIRM_ACCOUNT_NUMBER = "9967544SW"; // เลขบัญชี (ใช้ตอนเสกเงิน Magic)
    String savedAccountId = "cccc73bb-c37e-4987-b059-075da0dfee8a"; // เป็น hardcode สำหรับ user
    String AccountNumber = "9967544SW"; // hardcode สำหรับ user
    String savedAccountId_2 = "9d35fa1a-d10b-484c-abd5-6501dfee1ded";// เป็น hardcode สำหรับ user แบบที่ เทรด crypto

    @Transactional
    public UserAccount createAccount(CreateAccountRequest requestDto) {
        try {
            // 💡 สุ่ม Tax ID (SSN) รูปแบบ XXX-XX-XXXX เพื่อไม่ให้ซ้ำกันในระบบ Sandbox
            String randomSSN = String.format("%03d-%02d-%04d",
                    (int) (Math.random() * 900) + 100,
                    (int) (Math.random() * 90) + 10,
                    (int) (Math.random() * 9000) + 1000);

            // 1. สร้าง Contact (Hardcode ที่อยู่)
            Contact contact = new Contact()
                    .emailAddress(requestDto.getEmail())
                    .phoneNumber(requestDto.getPhoneNumber())
                    .streetAddress(Arrays.asList("123 Crypto Street", "Apt 4B")) // Hardcode
                    .city("San Francisco") // Hardcode
                    .state("CA") // Hardcode
                    .postalCode("94105"); // Hardcode

            // 2. สร้าง Identity (Hardcode วันเกิด, สัญชาติ และ SSN ที่สุ่มมา)
            Identity identity = new Identity()
                    .givenName(requestDto.getFirstName())
                    .familyName(requestDto.getLastName())
                    .dateOfBirth(LocalDate.parse("1990-01-01")) // Hardcode วันเกิด (ต้องอายุ 18+)
                    .taxId(randomSSN) // ใช้ SSN ที่สุ่ม
                    .taxIdType(TaxIdType.USA_SSN) // Hardcode
                    .countryOfCitizenship("USA") // Hardcode
                    .countryOfBirth("USA") // Hardcode
                    .countryOfTaxResidence("USA"); // Hardcode

            // 3. สร้าง Disclosures (Hardcode เป็น false ทั้งหมด)
            Disclosures disclosures = new Disclosures()
                    .isControlPerson(false)
                    .isAffiliatedExchangeOrFinra(false)
                    .isPoliticallyExposed(false)
                    .immediateFamilyExposed(false);

            // 4. ประกอบร่างเป็น AccountCreationRequest
            AccountCreationRequest alpacaReq = new AccountCreationRequest()
                    .contact(contact)
                    .identity(identity)
                    .disclosures(disclosures)
                    .agreements(Arrays.asList(
                            new Agreement().agreement(AgreementType.MARGIN_AGREEMENT).signedAt(OffsetDateTime.now())
                                    .ipAddress("127.0.0.1"),
                            new Agreement().agreement(AgreementType.ACCOUNT_AGREEMENT).signedAt(OffsetDateTime.now())
                                    .ipAddress("127.0.0.1"),
                            new Agreement().agreement(AgreementType.CUSTOMER_AGREEMENT).signedAt(OffsetDateTime.now())
                                    .ipAddress("127.0.0.1"),
                            new Agreement().agreement(AgreementType.CRYPTO_AGREEMENT).signedAt(OffsetDateTime.now())
                                    .ipAddress("127.0.0.1")));

            // 5. ยิง API ไปสร้างที่ Alpaca
            Account alpacaAccount = brokerAPI.broker().accounts().createAccount(alpacaReq);

            // 6. บันทึกลง Database ของเรา
            UserAccount localAccount = new UserAccount();
            localAccount.setEmail(requestDto.getEmail());
            localAccount.setPassword(requestDto.getPassword());
            localAccount.setAlpacaAccountId(String.valueOf(alpacaAccount.getId()));
            localAccount.setAccountNumber(alpacaAccount.getAccountNumber());
            localAccount.setStatus(alpacaAccount.getStatus().name());
            localAccount.setPhoneNumber(requestDto.getPhoneNumber());
            localAccount.setFirstName(requestDto.getFirstName()); // อย่าลืมเซฟลง DB
            localAccount.setLastName(requestDto.getLastName()); // อย่าลืมเซฟลง DB

            return accountRepository.save(localAccount);

        } catch (Exception e) {
            throw new RuntimeException("ไม่สามารถสร้างบัญชีได้: " + e.getMessage(), e);
        }
    }

    // สั่งซื้อหุ้นUser ---
    public Order createOrder(UUID accountId, String symbol, BigDecimal qty, BigDecimal notional, OrderSide side,
            OrderType type, TimeInForce tif, BigDecimal limitPrice, BigDecimal stopPrice) throws ApiException {
        log.info("Creating Order: Account={} Symbol={} Qty={} Notional={}", accountId, symbol, qty, notional);
        String shortSuffix = UUID.randomUUID().toString().substring(0, 6);
        String uniqueClientOrderId = accountId.toString() + "-" + shortSuffix;
        CreateOrderRequest request = new CreateOrderRequest()
                .symbol(symbol)
                .side(side)
                .clientOrderId(uniqueClientOrderId);
        if (qty != null && notional == null) {
            request.qty(qty);
            request.type(type); // ใช้ Type ตามที่ส่งมา (Limit/Market)
            request.timeInForce(tif); // ใช้ TIF ตามที่ส่งมา
            if (type == OrderType.LIMIT || type == OrderType.STOP_LIMIT) {
                if (limitPrice != null) {
                    request.limitPrice(limitPrice);
                } else {
                    throw new IllegalArgumentException("Limit Order ต้องใส่ราคา (Limit Price) เสมอ");
                }
            }
            if (type == OrderType.STOP || type == OrderType.STOP_LIMIT) {
                if (stopPrice != null) {
                    request.stopPrice(stopPrice);
                } else {
                    throw new IllegalArgumentException("Stop Order ต้องใส่ราคา (Stop Price) เสมอ");
                }
            }
        } else if (notional != null && qty == null) {
            BigDecimal actualNotional = notional.divide(FEE_MULTIPLIER, 2, RoundingMode.DOWN);
            request.notional(actualNotional);
            log.warn("Overriding OrderType to MARKET and TIF to DAY for Notional order"); // กฎของ Alpaca:ได้แค่ 2
                                                                                          // เงื่อนไข คือ ราคาตลาด กับ
                                                                                          // ระยะเวลา 1 วัน
            request.type(OrderType.MARKET);
            request.timeInForce(TimeInForce.DAY);
        } else {
            throw new IllegalArgumentException(
                    "ต้องเลือกใส่อย่างใดอย่างหนึ่งระหว่าง 'qty' หรือ 'notional' ห้ามใส่ทั้งคู่หรือปล่อยว่าง");
        }
        /*
         * return brokerAPI.broker().trading().createOrderForAccount(accountId,
         * request);
         */ // ไว้ซื้อแบบเก่า
        Order createdOrder = brokerAPI.broker().trading().createOrderForAccount(accountId, request);
        Optional<UserAccount> userOptional = accountRepository.findByAlpacaAccountId(accountId.toString());

        if (userOptional.isPresent()) {
            UserAccount user = userOptional.get();
            try {
                // 3. เรียกใช้เมธอด saveOrderHistory เพื่อบันทึกสถานะ "NEW"
                saveOrderHistory(createdOrder, user);
                log.info("✅ บันทึกออร์เดอร์สถานะ NEW ลง Database สำเร็จ: {}", createdOrder.getId());

                // 🚀 4. Trigger Behavioral Analytics (FOMO / Alert Check)
                triggerBehavioralAnalysis(user, symbol, side.name());

            } catch (Exception e) {
                log.error("❌ เกิดข้อผิดพลาดในการบันทึกประวัติออร์เดอร์ลง Database: {}", createdOrder.getId(), e);
            }
        } else {
            log.warn("⚠️ ไม่พบข้อมูลบัญชีผู้ใช้ในระบบ สำหรับ Alpaca ID: {} จึงไม่ได้บันทึกประวัติ", accountId);
        }

        // ่ส่งข้อมูลออร์เดอร์กลับไปให้ Controller ตามปกติ
        return createdOrder;
    }

    private void triggerBehavioralAnalysis(UserAccount user, String symbol, String side) {
        try {
            // ดึงราคาปัจจุบันเพื่อมาคำนวณการเปลี่ยนแปลง (FOMO)
            Map<String, Object> quote = marketDataService.getLatestQuote(symbol);
            double price = 0.0;
            if (quote.get("price") != null) {
                price = Double.parseDouble(quote.get("price").toString());
            }
            double prevClose = price;
            if (quote.get("prevClose") != null) {
                prevClose = Double.parseDouble(quote.get("prevClose").toString());
            }

            double priceChange = (prevClose != 0) ? ((price - prevClose) / prevClose) * 100 : 0.0;

            // ในระบบจำลองนี้ เราจะส่งค่าบางอย่างแบบ Mock ไปก่อนถ้าหาข้อมูลไม่ได้
            // เช่น volumeSoldPercent ถ้าเป็น Sell เราอาจจะถือว่าขายหมด (100%) เพื่อให้ Rule ทำงาน
            double volumeSold = side.equalsIgnoreCase("sell") ? 100.0 : 0.0;
            
            // ดึงสไตล์ของ User
            com.alpaca.web.enums.TraderType type = com.alpaca.web.enums.TraderType.valueOf(user.getTraderType() != null ? user.getTraderType() : "DAY_TRADER");

            behavioralAnalyticsService.evaluateOrderEvent(
                    user.getId(),
                    symbol,
                    side,
                    0.0, // currentProfit (ต้องคำนวณจาก Position จริงๆ ในอนาคต)
                    priceChange,
                    volumeSold,
                    type
            );
        } catch (Exception e) {
            log.error("⚠️ Failed to trigger behavioral analysis: {}", e.getMessage());
        }
    }

    // ฟังก์ชันเติมเงินเข้า Firm Account แบบถูกวิธี (ใช้ Funding API)
    public void fundAccount(UUID toAccountId, double amount) {
        try {
            log.info("Funding account {} with ${}", toAccountId, amount);

            CreateJournalRequest journalRequest = new CreateJournalRequest()
                    .entryType(JournalEntryType.JNLC)
                    .toAccount(toAccountId)
                    .fromAccount(UUID.fromString(FIRM_ACCOUNT_ID)) // ใช้จากตัวแปร class
                    .amount(String.valueOf(amount)) // แปลง double เป็น String เพราะ ต้องใช้ string
                    .description("fixture:executed");

            brokerAPI.broker().journals().createJournal(journalRequest);
            log.info("เติมเงินสำเร็จ!");

        } catch (Exception e) {
            log.error("เติมเงินไม่สำเร็จ", e);
        }
    }

    // เติมเงินให้ user
    @Async
    @Retryable(retryFor = { ApiException.class, IllegalStateException.class }, maxAttempts = 15, // 💡 เพิ่มรอบเป็น 15
                                                                                                 // ครั้ง (เผื่อ Alpaca
                                                                                                 // ช้า)
            backoff = @Backoff(delay = 5000) // 💡 รอ 5 วินาทีก่อนลองใหม่ (รวมเวลาพยายามคือ 15 * 5 = 75 วินาที)
    )
    public void addMoneyToUserAccount(UUID userAccountId, Double amount) throws ApiException {
        log.info("⏳ [Background Task] กำลังตรวจสอบบัญชี {} เพื่อเติมเงิน...", userAccountId);
        AccountExtended account = brokerAPI.broker().accounts().getAccount(userAccountId);

        // ถ้าสถานะยังไม่ ACTIVE ให้โยน Error ออกไป เพื่อให้ @Retryable สั่งรอ 5
        // วิแล้วทำงานใหม่
        if (!"ACTIVE".equals(account.getStatus().toString())) {
            log.warn("⚠️ บัญชี {} ยังไม่ ACTIVE รอทำซ้ำ...", userAccountId);
            throw new IllegalStateException("Account is not active yet");
        }

        // เมื่อ ACTIVE แล้วถึงจะรันบรรทัดล่างนี้
        CreateJournalRequest journalRequest = new CreateJournalRequest()
                .entryType(JournalEntryType.JNLC)
                .fromAccount(UUID.fromString(FIRM_ACCOUNT_ID))
                .toAccount(userAccountId)
                .amount(String.valueOf(amount))
                .description("Deposit by Admin Initial Fund");

        brokerAPI.broker().journals().createJournal(journalRequest);
        log.info("✅ โอนเงิน $100,000 เข้าบัญชี {} เรียบร้อยแล้ว!", userAccountId);
    }

    // เติมเงินเข้าบัญชีเรา (Sandbox ใช้ ACH เพราะ WIRE ต้องการ bank_id)
    public void addMoneyToFirmAccount(Double amount) {
        try {
            log.info("Admin: กำลังเสกเงินเข้า Firm Account จำนวน ${}", amount);

            CreateTransferRequest transferRequest = new CreateTransferRequest()
                    .transferType(TransferType.ACH) // ใช้ ACH แทน WIRE (Sandbox ไม่ต้องใช้ bank_id)
                    .direction(TransferDirection.INCOMING) // ขาเข้า (เติมเงิน)
                    .timing(TransferTiming.IMMEDIATE) // ทันที
                    .amount(BigDecimal.valueOf(amount));

            Transfer transfer = brokerAPI.broker().funding().createTransferForAccount(
                    UUID.fromString(FIRM_ACCOUNT_ID),
                    transferRequest);
            log.info("✅ เติมเงินเข้า Firm สำเร็จ! Transfer ID: {}", transfer.getId());

        } catch (ApiException e) {
            log.error("❌ ไม่สามารถเติมเงินเข้า Firm Account ได้", e);
            throw new RuntimeException("Error funding firm account: " + e.getMessage());
        }
    }

    public void cancelOrderForAccount(UUID accountId, String orderId) throws Exception {
        log.info("cancelOrderForAccount accountId: " + accountId + " orderId: " + orderId);
        brokerAPI.broker().trading().deleteOrderForAccount(accountId, orderId);
    }

    public Order getSingleOrder(UUID accountId, String orderId) throws Exception {
        log.info("OrderService: Retrieving single order {} for account {}", orderId, accountId);

        return brokerAPI.broker().trading().getOrderForAccount(accountId, orderId);
    }

    public List<Order> getAllOrders(UUID accountId, String status, Integer limit, String symbols) throws Exception {
        log.info("getAllOrders accountId: " + accountId);
        log.info("getAllOrders status: " + status);
        log.info("getAllOrders limit: " + limit);
        return brokerAPI.broker().trading().getAllOrdersForAccount(
                accountId,
                status,
                limit,
                null,
                null,
                null,
                null,
                symbols,
                null,
                null,
                null);
    }

    public TradeAccount getAccount(UUID accountId) {
        try {
            // method getTradingAccount ของ Broker API คืนค่าเป็น TradeAccount
            return brokerAPI.broker().accounts().getTradingAccount(accountId);
        } catch (ApiException e) {
            log.error("getAccount error", e);
            throw new RuntimeException(e);
        }
    }

    public List<Position> getPositions(UUID accountId) throws Exception { // ดึง order หรือ หุ้นที่ user ถืออยู่
        log.info("getPositions accountId: " + accountId);
        return brokerAPI.broker().trading().getPositionsForAccount(accountId);
    }

    public List<Account> getAllAccounts() throws Exception {
        log.info("Admin: Fetching all accounts...");
        return brokerAPI.broker().accounts().getAllAccounts(
                null,
                null,
                null,
                null,
                "desc", // sort (desc = ใหม่สุดขึ้นก่อน)
                null);
    }

    public Order createCryptoOrder(UUID accountId, String symbol, BigDecimal qty, BigDecimal notional, OrderSide side,
            OrderType type, TimeInForce tif, BigDecimal limitPrice, BigDecimal stopPrice) throws ApiException {
        String shortSuffix = UUID.randomUUID().toString().substring(0, 6);
        String uniqueClientOrderId = accountId.toString() + "-" + shortSuffix;
        // 1. จัดการ Symbol
        String cleanSymbol = symbol.trim().toUpperCase();
        if (!cleanSymbol.contains("/")) {
            cleanSymbol = cleanSymbol + "/USD";
        }

        // 🔍 Log 1: ดูข้อมูลดิบที่ส่งเข้ามาจาก Controller
        log.info("=================================================");
        log.info(" [CryptoOrder] Start Creating Order...");
        log.info(" Inputs: Account={}, Symbol={}, Side={}, Type={}", accountId, cleanSymbol, side, type);
        log.info(" Values: Qty={}, Notional={}, LimitPrice={}", qty, notional, limitPrice);

        // 2. เตรียม Request
        CreateOrderRequest request = new CreateOrderRequest()
                .symbol(cleanSymbol)
                .side(side)
                .timeInForce(TimeInForce.GTC) // Crypto ใช้ GTC เป็นหลัก
                .clientOrderId(uniqueClientOrderId);

        // 3. Logic เลือกส่ง Qty หรือ Notional
        if (qty != null && notional == null) {
            // กรณีระบุจำนวนเหรียญ
            request.qty(qty);
            request.type(type); // ใช้ Type ที่ส่งมา (MARKET, LIMIT, STOP, STOP_LIMIT)

            // ✅ 1. เช็คและใส่ Limit Price
            if (type == OrderType.LIMIT || type == OrderType.STOP_LIMIT) {
                if (limitPrice != null) {
                    request.limitPrice(limitPrice);
                    log.info("✅ Set Limit Price: {}", limitPrice);
                } else {
                    log.error("❌ Error: Limit Order but Limit Price is NULL");
                    throw new IllegalArgumentException("Limit Order / Stop Limit ต้องใส่ราคา (Limit Price) เสมอ");
                }
            }
            if (type == OrderType.STOP || type == OrderType.STOP_LIMIT) {
                if (stopPrice != null) {
                    request.stopPrice(stopPrice);
                    log.info("✅ Set Stop Price: {}", stopPrice);
                } else {
                    log.error("❌ Error: Stop Order but Stop Price is NULL");
                    throw new IllegalArgumentException("Stop Order / Stop Limit ต้องใส่ราคา (Stop Price) เสมอ");
                }
            }
        } else if (notional != null && qty == null) {
            // กรณีระบุจำนวนเงิน -> บังคับ Market
            BigDecimal actualNotional = notional.divide(FEE_MULTIPLIER, 2, RoundingMode.DOWN);
            request.notional(actualNotional);
            request.type(OrderType.MARKET);
            log.info("ℹ️ Using Notional Amount -> Force Market Order");
        } else {
            log.error("❌ Error: Ambiguous Input (Qty={} Notional={})", qty, notional);
            throw new IllegalArgumentException("ต้องเลือกใส่อย่างใดอย่างหนึ่งระหว่าง 'qty' หรือ 'notional'");
        }

        // 📦 Log 2: ดูหน้าตา Request สุดท้ายที่จะส่งไป Alpaca
        log.info("🚀 [CryptoOrder] Sending Request to Alpaca: {}", request.toString());

        // 4. ยิงคำสั่ง และบันทึกลง Database ทันที
        try {
            Order order = brokerAPI.broker().trading().createOrderForAccount(accountId, request);

            // ✅ สิ่งที่เพิ่มเข้ามา: ค้นหา User และบันทึกสถานะ NEW ลง Database
            Optional<UserAccount> userOptional = accountRepository.findByAlpacaAccountId(accountId.toString());
            if (userOptional.isPresent()) {
                UserAccount user = userOptional.get();
                try {
                    // เรียกใช้เมธอด saveOrderHistory ที่เราเพิ่งแก้เรื่องกันการทับสถานะ FILLED ไป
                    saveOrderHistory(order, user);
                    log.info("✅ บันทึกออร์เดอร์คริปโตสถานะ NEW ลง Database สำเร็จ: {}", order.getId());

                    // 🚀 Trigger Behavioral Analytics
                    triggerBehavioralAnalysis(user, symbol, side.name());

                } catch (Exception dbEx) {
                    log.error("❌ เกิดข้อผิดพลาดในการบันทึกประวัติออร์เดอร์คริปโตลง Database: {}", order.getId(), dbEx);
                }
            } else {
                log.warn("⚠️ ไม่พบข้อมูลบัญชีผู้ใช้ในระบบ สำหรับ Alpaca ID: {} จึงไม่ได้บันทึกประวัติออร์เดอร์คริปโต",
                        accountId);
            }
            log.info("✅ [CryptoOrder] SUCCESS! Order ID: {}, Status: {}", order.getId(), order.getStatus());
            log.info("=================================================");
            return order;
        } catch (ApiException e) {
            // ❌ Log 4: ถ้าพัง พังเพราะอะไร (ปริ้น Response Body ออกมาดูเลย)
            log.error("🔥 [CryptoOrder] FAILED! Alpaca Error: {}", e.getMessage());
            log.error("🔥 [CryptoOrder] Response Body: {}", e.getResponseBody()); // ทีเด็ดอยู่ตรงนี้!
                                                                                  // มันจะบอกว่าผิดตรงไหน
            throw e;
        }
    }

    // เก็บค่าธรรมเนียม
    public void collectTradingFee(UUID userAccountId, BigDecimal FeeAmount) {
        String formattedFee = String.format("%.2f", FeeAmount);
        try {
            log.info("Fee : กำลังเก็บค่าธรรมเนียมจาก user {} จำนวน ${}", userAccountId, FeeAmount);
            CreateJournalRequest journalRequest = new CreateJournalRequest()
                    .entryType(JournalEntryType.JNLC)
                    .fromAccount(userAccountId)
                    .toAccount(UUID.fromString(FIRM_ACCOUNT_ID))
                    .amount(formattedFee)
                    .description("Tradeing commission Fee");
            brokerAPI.broker().journals().createJournal(journalRequest);
        } catch (ApiException e) {
            log.error("ไม่สามารถเก็บค่าธรรมเนียมได้ {}", e.getMessage());
        }
    }

    public List<UserAccount> getAllLocalUsers() {
        log.info("Admin: Fetching all accounts from Local Database...");
        return accountRepository.findAll();
    }

    public void saveOrderHistory(Order order, UserAccount currentUser) {
        OrderHistory trade = new OrderHistory();

        // ใช้ != null ? ... : null เพื่อป้องกันการบันทึกคำว่า "null" ลง DB
        trade.setOrderId(order.getId() != null ? order.getId().toString() : null);
        trade.setUserAccount(currentUser);
        trade.setSymbol(order.getSymbol());
        trade.setAssetClass(order.getAssetClass() != null ? order.getAssetClass().name() : null);
        trade.setSide(order.getSide() != null ? order.getSide().name() : null);
        trade.setType(order.getOrderType() != null ? order.getOrderType().name() : null);
        trade.setStatus(order.getStatus() != null ? order.getStatus().name() : null);
        trade.setQty(order.getQty());
        trade.setNotional(order.getNotional());
        trade.setLimitPrice(order.getLimitPrice());
        // สมมติว่าใน OrderHistory ของคุณ Qty ยังเป็น String อยู่ (แม้จะไม่แนะนำก็ตาม)
        trade.setFilledQty(order.getFilledQty());
        trade.setFilledAvgPrice(order.getFilledAvgPrice());
        trade.setCommission(order.getCommission());

        // การจัดการเวลา ใช้ Instant จาก java.time
        if (order.getCreatedAt() != null) {
            trade.setCreatedAt(order.getCreatedAt().toInstant());
        }
        if (order.getFilledAt() != null) {
            trade.setFilledAt(order.getFilledAt().toInstant());
        }
        trade.setClientOrderId(order.getClientOrderId());
        trade.setTimeInForce(order.getTimeInForce() != null ? order.getTimeInForce().name() : null);
        trade.setAssetId(order.getAssetId() != null ? order.getAssetId().toString() : null);
        trade.setExtendedHours(order.getExtendedHours());
        // บันทึกลง Database
        orderHistoryRepository.save(trade);
    }

    @Transactional
    public UserAccount saveOnboardingData(OnboardingRequest request) {

        UserAccount user = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("ไม่พบบัญชีผู้ใช้งาน email: " + request.getEmail()));

        // อัปเดตข้อมูล
        user.setTraderType(request.getTraderType());
        user.setRiskBehavior(request.getRiskBehavior());

        // Save ลง Database
        return accountRepository.save(user);
    }
}
