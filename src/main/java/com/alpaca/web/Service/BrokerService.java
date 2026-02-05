package com.alpaca.web.Service;

import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType;

// Import ฝั่ง Broker (สำหรับสร้างบัญชีและคำสั่งซื้อ)
import net.jacobpeterson.alpaca.model.websocket.updates.model.tradeupdate.TradeUpdate;
import net.jacobpeterson.alpaca.openapi.broker.ApiException;
import net.jacobpeterson.alpaca.openapi.broker.model.*;
import net.jacobpeterson.alpaca.openapi.broker.model.CreateTransferRequest;
import net.jacobpeterson.alpaca.openapi.broker.model.Order;
import net.jacobpeterson.alpaca.openapi.broker.model.OrderSide;
import net.jacobpeterson.alpaca.openapi.broker.model.OrderType;
import net.jacobpeterson.alpaca.openapi.broker.model.TimeInForce;
import net.jacobpeterson.alpaca.openapi.broker.model.Transfer;
import net.jacobpeterson.alpaca.openapi.broker.model.Account;
import net.jacobpeterson.alpaca.openapi.broker.model.Agreement;
import net.jacobpeterson.alpaca.openapi.broker.model.Contact;
import net.jacobpeterson.alpaca.openapi.broker.model.TransferType;      // แยกไฟล์
import net.jacobpeterson.alpaca.openapi.broker.model.TransferDirection; // แยกไฟล์
import net.jacobpeterson.alpaca.openapi.broker.model.TransferTiming;
import net.jacobpeterson.alpaca.openapi.broker.model.AccountCreationRequest; // ต้องมีตัวนี้
import net.jacobpeterson.alpaca.openapi.broker.model.CreateOrderRequest; // ต้องมีตัวนี้
import net.jacobpeterson.alpaca.openapi.broker.model.Disclosures;
import net.jacobpeterson.alpaca.openapi.broker.model.Identity;
import net.jacobpeterson.alpaca.openapi.broker.model.TaxIdType;
import net.jacobpeterson.alpaca.openapi.broker.model.CreateJournalRequest;
import net.jacobpeterson.alpaca.websocket.updates.UpdatesListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class BrokerService {
    Dotenv dotenv = Dotenv.load();
    String brokerApiKey = dotenv.get("BROKER_API_KEY");
    String brokerApiSecret = dotenv.get("BROKER_API_SECRET");
    private AlpacaAPI brokerAPI;

    @PostConstruct
    public void init() {
        String brokerApiKey = dotenv.get("BROKER_API_KEY");
        String brokerApiSecret = dotenv.get("BROKER_API_SECRET");
        this.brokerAPI = new AlpacaAPI(brokerApiKey, brokerApiSecret, BrokerAPIEndpointType.SANDBOX);
        log.info("Alpaca Broker API Initialized");
        try {
            brokerAPI.broker().updates().setListener(new UpdatesListener() {
                @Override
                public void onTradeUpdate(TradeUpdate tradeUpdate) {
                    // เช็คเหตุการณ์: ถ้าเป็นการ Fill (ซื้อขายสำเร็จ)
                    if ("fill".equalsIgnoreCase(String.valueOf(tradeUpdate.getEvent()))) {
                        try {
                            // ดึงข้อมูลสำคัญ
                            // หมายเหตุ: เช็คให้ดีว่า tradeUpdate.getOrder() คืนค่า object Order ที่ถูกต้อง
                            // ถ้าใน library version ใหม่ๆ อาจต้อง cast หรือเรียก method ต่างไปนิดหน่อย
                            net.jacobpeterson.alpaca.model.endpoint.orders.Order order = tradeUpdate.getOrder();
                            UUID accountId = order.getorder();

                            double filledPrice = tradeUpdate.getPrice().doubleValue();
                            double qty = tradeUpdate.getQuantity()..doubleValue();

                            // 🟢 คำนวณค่าธรรมเนียม 2.5% ณ เวลานั้น
                            double totalCost = filledPrice * qty;
                            double fee = totalCost * 0.025;

                            // สั่งตัดเงินทันที!
                            collectTradingFee(accountId, fee);

                            log.info("✅ Auto-Deduct Fee: Order {} | Fee ${}", order.getId(), fee);
                        } catch (Exception e) {
                            log.error("❌ Error deducting fee via WebSocket", e);
                        }
                    }
                }
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
    String savedAccountId = "cccc73bb-c37e-4987-b059-075da0dfee8a"; //เป็น hardcode สำหรับ user
    String AccountNumber = "9967544SW"; //hardcode สำหรับ user
    String savedAccountId_2 = "9d35fa1a-d10b-484c-abd5-6501dfee1ded" ;//เป็น hardcode สำหรับ user แบบที่ เทรด crypto

    public Account createAccount() {
        try {
            log.info("กำลังสร้างบัญชีลูกค้าใหม่...");
            Contact contact = new Contact()
                    .emailAddress("user_" + System.currentTimeMillis() + "@example.com")
                    .phoneNumber("111-222-3333")
                    .streetAddress(Arrays.asList("test can buy crypto"))
                    .city("San Francisco").state("CA").postalCode("94105");  //NY ไม่สมารถเทรด crypto

            Identity identity = new Identity()
                    .givenName("Tests").familyName("User2")
                    .dateOfBirth(LocalDate.of(1990, 1, 1))
                    .taxId("456-55-4321")
                    .taxIdType(TaxIdType.USA_SSN)
                    .countryOfCitizenship("USA").countryOfBirth("USA").countryOfTaxResidence("USA");

            Disclosures disclosures = new Disclosures()
                    .isControlPerson(false).isAffiliatedExchangeOrFinra(false).isPoliticallyExposed(false).immediateFamilyExposed(false);

            AccountCreationRequest request = new AccountCreationRequest()
                    .contact(contact)
                    .identity(identity)
                    .disclosures(disclosures)
                    .agreements(Arrays.asList(
                            new Agreement().agreement(AgreementType.MARGIN_AGREEMENT).signedAt(OffsetDateTime.now()).ipAddress("127.0.0.1"),
                            new Agreement().agreement(AgreementType.ACCOUNT_AGREEMENT).signedAt(OffsetDateTime.now()).ipAddress("127.0.0.1"),
                            new Agreement().agreement(AgreementType.CUSTOMER_AGREEMENT).signedAt(OffsetDateTime.now()).ipAddress("127.0.0.1"),
                            new Agreement().agreement(AgreementType.CRYPTO_AGREEMENT).signedAt(OffsetDateTime.now()).ipAddress("127.0.0.1")
                    ));

            Account account = brokerAPI.broker().accounts().createAccount(request);
            log.info("Success: Account ID: {}", account.getId());
            return account;

        } catch (Exception e) {
            log.error("Create account fail", e);
            throw new RuntimeException(e);
        }
    }

    // สั่งซื้อหุ้นUser ---
    public Order createOrder(UUID accountId, String symbol, BigDecimal qty, BigDecimal notional, OrderSide side, OrderType type, TimeInForce tif ,BigDecimal limitPrice ,BigDecimal stopPrice) throws ApiException {
        log.info("Creating Order: Account={} Symbol={} Qty={} Notional={}", accountId, symbol, qty, notional);
        CreateOrderRequest request = new CreateOrderRequest()
                .symbol(symbol)
                .side(side);
        if (qty != null && notional == null) {
            request.qty(qty);
            request.type(type);       // ใช้ Type ตามที่ส่งมา (Limit/Market)
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
            request.notional(notional);
            log.warn("Overriding OrderType to MARKET and TIF to DAY for Notional order");  //กฎของ Alpaca:ได้แค่ 2 เงื่อนไข คือ ราคาตลาด กับ ระยะเวลา 1 วัน
            request.type(OrderType.MARKET);
            request.timeInForce(TimeInForce.DAY);
        } else {
            throw new IllegalArgumentException("ต้องเลือกใส่อย่างใดอย่างหนึ่งระหว่าง 'qty' หรือ 'notional' ห้ามใส่ทั้งคู่หรือปล่อยว่าง");
        }
        return brokerAPI.broker().trading().createOrderForAccount(accountId, request);
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
    //เติมเงินให้ user
    public void addMoneyToUserAccount(UUID userAccountId, Double amount) {
        try {
            log.info("Admin: กำลังโอนเงินจาก Firm -> User {} จำนวน ${}", userAccountId, amount);

            CreateJournalRequest journalRequest = new CreateJournalRequest()
                    .entryType(JournalEntryType.JNLC)       // JNLC = Journal Cash
                    .fromAccount(UUID.fromString(FIRM_ACCOUNT_ID)) // ต้นทาง: เงินจาก Firm
                    .toAccount(userAccountId)                      // ปลายทาง: เข้ากระเป๋า User
                    .amount(String.valueOf(amount))
                    .description("Deposit by Admin (Sandbox Magic)");

            brokerAPI.broker().journals().createJournal(journalRequest);
            log.info("✅ เสกเงินให้ User สำเร็จ!");

        } catch (ApiException e) {
            log.error("❌ ไม่สามารถเสกเงินให้ User ได้ (ตรวจสอบยอดเงิน Firm หรือ ID)", e);
            throw new RuntimeException("Error funding user account: " + e.getMessage());
        }
    }
    //เติมเงินเข้าบัญชีเรา
    public void addMoneyToFirmAccount(Double amount) {
        try {
            log.info("Admin: กำลังเสกเงินเข้า Firm Account จำนวน ${}", amount);

            CreateTransferRequest transferRequest = new CreateTransferRequest()
                    .transferType(TransferType.WIRE)       // จำลองการโอนแบบ Wire
                    .direction(TransferDirection.INCOMING) // ขาเข้า (เติมเงิน)
                    .timing(TransferTiming.IMMEDIATE)      // ทันที
                    .amount(BigDecimal.valueOf(amount));

            Transfer transfer = brokerAPI.broker().funding().createTransferForAccount(
                    UUID.fromString(FIRM_ACCOUNT_ID), // <--- ปิดวงเล็บตรงนี้
                    transferRequest                   // <--- parameter ตัวที่ 2
            );
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
                null
        );
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

    public List<Position> getPositions(UUID accountId) throws Exception {   //ดึง order หรือ หุ้นที่ user ถืออยู่
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
                "contact,identity"
        );
    }
    public Order createCryptoOrder(UUID accountId, String symbol, BigDecimal qty, BigDecimal notional, OrderSide side, OrderType type, TimeInForce tif, BigDecimal limitPrice, BigDecimal stopPrice) throws ApiException {

        // 1. จัดการ Symbol
        String cleanSymbol = symbol.trim().toUpperCase();
        if (!cleanSymbol.contains("/")) {
            cleanSymbol = cleanSymbol + "/USD";
        }

        // 🔍 Log 1: ดูข้อมูลดิบที่ส่งเข้ามาจาก Controller
        log.info("=================================================");
        log.info("🕵️ [CryptoOrder] Start Creating Order...");
        log.info("👉 Inputs: Account={}, Symbol={}, Side={}, Type={}", accountId, cleanSymbol, side, type);
        log.info("💰 Values: Qty={}, Notional={}, LimitPrice={}", qty, notional, limitPrice);

        // 2. เตรียม Request
        CreateOrderRequest request = new CreateOrderRequest()
                .symbol(cleanSymbol)
                .side(side)
                .timeInForce(TimeInForce.GTC); // Crypto ใช้ GTC เป็นหลัก

        // 3. Logic เลือกส่ง Qty หรือ Notional
        if (qty != null && notional == null) {
            // กรณีระบุจำนวนเหรียญ
            request.qty(qty);
            request.type(type); // ใช้ Type ที่ส่งมา (MARKET หรือ LIMIT)

            // เช็คและใส่ Limit Price
            if (type == OrderType.LIMIT || type == OrderType.STOP_LIMIT) {
                if (limitPrice != null) {
                    request.limitPrice(limitPrice);
                    log.info("✅ Set Limit Price: {}", limitPrice);
                } else {
                    log.error("❌ Error: Limit Order but Limit Price is NULL");
                    throw new IllegalArgumentException("Limit Order ต้องใส่ราคา (Limit Price) เสมอ");
                }
            }
        } else if (notional != null && qty == null) {
            // กรณีระบุจำนวนเงิน -> บังคับ Market
            request.notional(notional);
            request.type(OrderType.MARKET);
            log.info("ℹ️ Using Notional Amount -> Force Market Order");
        } else {
            log.error("❌ Error: Ambiguous Input (Qty={} Notional={})", qty, notional);
            throw new IllegalArgumentException("ต้องเลือกใส่อย่างใดอย่างหนึ่งระหว่าง 'qty' หรือ 'notional'");
        }

        // 📦 Log 2: ดูหน้าตา Request สุดท้ายที่จะส่งไป Alpaca
        log.info("🚀 [CryptoOrder] Sending Request to Alpaca: {}", request.toString());

        // 4. ยิงคำสั่ง
        try {
            Order order = brokerAPI.broker().trading().createOrderForAccount(accountId, request);

            // ✅ Log 3: ถ้าสำเร็จ ได้ Order ID อะไรกลับมา
            log.info("✅ [CryptoOrder] SUCCESS! Order ID: {}, Status: {}", order.getId(), order.getStatus());
            log.info("=================================================");
            return order;

        } catch (ApiException e) {
            // ❌ Log 4: ถ้าพัง พังเพราะอะไร (ปริ้น Response Body ออกมาดูเลย)
            log.error("🔥 [CryptoOrder] FAILED! Alpaca Error: {}", e.getMessage());
            log.error("🔥 [CryptoOrder] Response Body: {}", e.getResponseBody()); // ทีเด็ดอยู่ตรงนี้! มันจะบอกว่าผิดตรงไหน
            throw e;
        }
    }
        //เก็บค่าธรรมเนียม
    public  void  collectTradingFee(UUID userAccountId, Double FeeAmount) {
        try {
             log.info("Fee : กำลังเก็บค่าธรรมเนียมจาก user {} จำนวน ${}", userAccountId, FeeAmount);
             CreateJournalRequest journalRequest = new CreateJournalRequest()
                     .entryType(JournalEntryType.JNLC)
                     .fromAccount(userAccountId)
                     .toAccount(UUID.fromString(FIRM_ACCOUNT_ID))
                     .amount(String.valueOf(FeeAmount))
                     .description("Tradeing commission Fee");
             brokerAPI.broker().journals().createJournal(journalRequest);
        } catch (ApiException e) {
            log.error("ไม่สามารถเก็บค่าธรรมเนียมได้ {}", e.getMessage());
        }
    }
}

