package com.alpaca.web.Service;

import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.model.util.apitype.BrokerAPIEndpointType;

// Import ฝั่ง Broker (สำหรับสร้างบัญชีและคำสั่งซื้อ)
import net.jacobpeterson.alpaca.openapi.broker.ApiException;
import net.jacobpeterson.alpaca.openapi.broker.model.*;
import net.jacobpeterson.alpaca.openapi.broker.model.ACHRelationship;
import net.jacobpeterson.alpaca.openapi.broker.model.CreateACHRelationshipRequest;
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
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import net.jacobpeterson.alpaca.openapi.marketdata.model.*;


import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
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
    }

    public AlpacaAPI getApi() {
        return this.brokerAPI;
    }

    private static final Logger log = LoggerFactory.getLogger(BrokerService.class);

    // 🏦 ข้อมูลบัญชีบริษัท (Firm Account)
    private static final String FIRM_ACCOUNT_ID = "f34e892f-10ab-3c84-810f-bcbb24f5b975"; // UUID (ใช้ตอนโอน Journal)
    private static final String FIRM_ACCOUNT_NUMBER = "9967544SW"; // เลขบัญชี (ใช้ตอนเสกเงิน Magic)
    String savedAccountId = "cccc73bb-c37e-4987-b059-075da0dfee8a"; //เป็น hardcode สำหรับ user
    String AccountNumber = "9967544SW"; //hardcode สำหรับ user

    public Account createAccount() {
        try {
            log.info("กำลังสร้างบัญชีลูกค้าใหม่...");

            Contact contact = new Contact()
                    .emailAddress("user_" + System.currentTimeMillis() + "@example.com")
                    .phoneNumber("555-666-7777")
                    .streetAddress(Arrays.asList("123 Test St"))
                    .city("New York").state("NY").postalCode("10001");

            Identity identity = new Identity()
                    .givenName("Test").familyName("User")
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
                            new Agreement().agreement(AgreementType.CUSTOMER_AGREEMENT).signedAt(OffsetDateTime.now()).ipAddress("127.0.0.1")
                    ));

            Account account = brokerAPI.broker().accounts().createAccount(request);
            log.info("Success: Account ID: {}", account.getId());
            return account;

        } catch (Exception e) {
            log.error("Create account fail", e);
            throw new RuntimeException(e);
        }
    }

    // --- ฟังก์ชันสำหรับขั้นตอนที่ 2: สั่งซื้อหุ้นให้ User ---
    public Order createOrder(UUID accountId, String symbol, BigDecimal qty, BigDecimal notional, OrderSide side, OrderType type, TimeInForce tif) throws ApiException {
        log.info("Creating Order: Account={} Symbol={} Qty={} Notional={}", accountId, symbol, qty, notional);
        CreateOrderRequest request = new CreateOrderRequest()
                .symbol(symbol)
                .side(side);
        if (qty != null && notional == null) {
            request.qty(qty);
            request.type(type);       // ใช้ Type ตามที่ส่งมา (Limit/Market)
            request.timeInForce(tif); // ใช้ TIF ตามที่ส่งมา
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


    // --- ฟังก์ชันสำหรับเติมเงินเข้าบัญชี (Journal Cash) ---


    // ⭐ ฟังก์ชันเติมเงินเข้า Firm Account แบบถูกวิธี (ใช้ Funding API)
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
            log.info("ติมเงินสำเร็จ!");

        } catch (Exception e) {
            log.error("เติมเงินไม่สำเร็จ", e);
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
            // หมายเหตุ: method getTradingAccount ของ Broker API คืนค่าเป็น TradeAccount
            return brokerAPI.broker().accounts().getTradingAccount(accountId);
        } catch (ApiException e) {
            log.error("getAccount error", e);
            throw new RuntimeException(e);
        }
    }
}

