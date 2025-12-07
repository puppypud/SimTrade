package com.alpaca.web.Service;

import io.github.cdimascio.dotenv.Dotenv;
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

    // ⭐ นี่คือจุดสำคัญ! สร้าง Bean เพื่อส่งไปให้ Controller ใช้งาน
    private AlpacaAPI brokerAPI() {
        return new AlpacaAPI(brokerApiKey, brokerApiSecret, BrokerAPIEndpointType.SANDBOX);
    }

    private static final Logger log = LoggerFactory.getLogger(BrokerService.class);

    // 🏦 ข้อมูลบัญชีบริษัท (Firm Account)
    private static final String FIRM_ACCOUNT_ID = "f34e892f-10ab-3c84-810f-bcbb24f5b975"; // UUID (ใช้ตอนโอน Journal)
    private static final String FIRM_ACCOUNT_NUMBER = "9967544SW"; // เลขบัญชี (ใช้ตอนเสกเงิน Magic)
    String savedAccountId = "cccc73bb-c37e-4987-b059-075da0dfee8a"; //เป็น hardcode สำหรับ user
    String AccountNumber = "9967544SW"; //hardcode สำหรับ user

    // --- ฟังก์ชันสำหรับขั้นตอนที่ 1: สร้าง User และปริ้นท์ ID ---
    public static void createAndPrintID(AlpacaAPI api) {
        try {
            System.out.println("กำลังสร้างบัญชีลูกค้าใหม่...");

            // ข้อมูลสมมติ (ใน Sandbox ใช้ข้อมูลปลอมได้ แต่ Format ต้องถูก)
            Contact contact = new Contact()
                    .emailAddress("user_test_" + System.currentTimeMillis() + "@example.com")
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
                            // ใน .agreements(Arrays.asList(...))
                            new Agreement()
                                    .agreement(AgreementType.MARGIN_AGREEMENT) // ✅ ใช้ Enum ของ AgreementType (ชื่ออาจเป็น MARGIN หรือ MARGIN_AGREEMENT ลองกด . ดูครับ)
                                    .signedAt(OffsetDateTime.now())            // ✅ ส่งเป็น Object เวลา (ไม่ต้องแปลงเป็น String)
                                    .ipAddress("127.0.0.1"),

                            new Agreement()
                                    .agreement(AgreementType.ACCOUNT_AGREEMENT)
                                    .signedAt(OffsetDateTime.now())
                                    .ipAddress("127.0.0.1"),

                            new Agreement()
                                    .agreement(AgreementType.CUSTOMER_AGREEMENT)
                                    .signedAt(OffsetDateTime.now())
                                    .ipAddress("127.0.0.1")
                    ));

            // ยิง API ไปสร้าง
            Account account = api.broker().accounts().createAccount(request);

            System.out.println("\n########################################");
            System.out.println("Successful:");
            System.out.println("Account ID: " + account.getId().toString());
            System.out.println("########################################\n");

        } catch (Exception e) {
            System.err.println("fail: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // --- ฟังก์ชันสำหรับขั้นตอนที่ 2: สั่งซื้อหุ้นให้ User ---
    public Order createOrder(UUID accountId, String symbol, BigDecimal qty, OrderSide side, OrderType type, TimeInForce tif) throws  ApiException {

        log.info("Creating Order: Account={} Symbol={} Qty={}", accountId, symbol, qty);
        return brokerAPI().broker().trading().createOrderForAccount(
                            accountId,
                new CreateOrderRequest()
                        .symbol(symbol)
                        .qty(qty)
                        .side(side)
                        .type(type)
                        .timeInForce(tif)
        );
    }

    // --- ฟังก์ชันสำหรับเติมเงินเข้าบัญชี (Journal Cash) ---
    public static void fundAccount(AlpacaAPI api, String accountIdStr, double amount) {
        try {
            // 🔹 เอา Firm Account ID ที่หาได้มาใส่ตรงนี้
            String firmAccountId = "f34e892f-10ab-3c84-810f-bcbb24f5b975";
            System.out.println("money $" + amount + " acc: " + accountIdStr);

            // ✅ แก้ไขตรงนี้: เปลี่ยน JournalData เป็น CreateJournalRequest
            CreateJournalRequest journalRequest = new CreateJournalRequest()
                    .entryType(JournalEntryType.JNLC) // ใส่เป็น String "JNLC" ได้เลย (หรือถ้ามี Enum ให้ใช้ CreateJournalRequest.EntryTypeEnum.JNLC)
                    .toAccount(UUID.fromString(accountIdStr))
                    .fromAccount(UUID.fromString(firmAccountId))
                    .amount(String.valueOf(amount))
                    .description("fixture:executed");

            // ยิง API โอนเงิน
            api.broker().journals().createJournal(journalRequest);

            System.out.println("✅ เติมเงินสำเร็จ! พร้อมเทรดแล้ว");

        } catch (Exception e) {
            System.err.println("❌ เติมเงินไม่สำเร็จ: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ⭐ ฟังก์ชันเติมเงินเข้า Firm Account แบบถูกวิธี (ใช้ Funding API)
    public static void fundFirmAccountProperly(AlpacaAPI api, double amount) {
        try {
            UUID firmId = UUID.fromString(FIRM_ACCOUNT_ID);
            System.out.println("🏦 กำลังดำเนินการเติมเงินเข้า Firm Account (" + firmId + ")...");

            // -------------------------------------------------------
            // 1. หา ACH Relationship เดิมก่อน (แก้ปัญหา 409 Conflict)
            // -------------------------------------------------------
            UUID relationshipId = null;

            try {
                // ดึงรายการ ACH Relationship ทั้งหมดของ Account นี้
                List<ACHRelationship> existingRels = api.broker().funding().getAccountACHRelationships(firmId, null);

                if (!existingRels.isEmpty()) {
                    // ✅ กรณีเจอของเก่า: ใช้ ID ตัวแรกเลย
                    ACHRelationship oldRel = existingRels.get(0);
                    relationshipId = oldRel.getId();
                    System.out.println("🔁 พบการเชื่อมต่อธนาคารเดิมอยู่แล้ว (ใช้ Relationship ID: " + relationshipId + ")");
                }
            } catch (Exception e) {
                System.out.println("⚠️ ไม่สามารถดึงข้อมูล Relationship เดิมได้ (อาจจะยังไม่มี): " + e.getMessage());
            }

            // -------------------------------------------------------
            // 2. ถ้ายังไม่มี ID (แปลว่ายังไม่เคยเชื่อม) -> ให้สร้างใหม่
            // -------------------------------------------------------
            if (relationshipId == null) {
                System.out.println("🆕 ไม่พบการเชื่อมต่อเดิม กำลังสร้างใหม่...");

                CreateACHRelationshipRequest bankData = new CreateACHRelationshipRequest()
                        .accountOwnerName("Test Firm Admin")
                        .bankAccountType(CreateACHRelationshipRequest.BankAccountTypeEnum.CHECKING)
                        .bankAccountNumber("1234567890")
                        .bankRoutingNumber("110000000") // Sandbox Magic Number
                        .nickname("Sandbox Bank Link");

                ACHRelationship newRel = api.broker().funding().createACHRelationshipForAccount(firmId, bankData);
                relationshipId = newRel.getId();
                System.out.println("🔗 สร้างการเชื่อมต่อใหม่สำเร็จ (Relationship ID: " + relationshipId + ")");
            }

            // -------------------------------------------------------
            // 3. สั่งโอนเงิน (Transfer) โดยใช้ relationshipId ที่หามาได้
            // -------------------------------------------------------
            CreateTransferRequest transferData = new CreateTransferRequest()
                    .transferType(TransferType.ACH)
                    .relationshipId(relationshipId) // ✅ ใช้ ID ที่ถูกต้องแน่นอน
                    .amount(BigDecimal.valueOf(amount))
                    .direction(TransferDirection.INCOMING)
                    .timing(TransferTiming.IMMEDIATE);

            Transfer transfer = api.broker().funding().createTransferForAccount(firmId, transferData);

            System.out.println("✅ ส่งคำสั่งโอนเงินสำเร็จ! (Transfer ID: " + transfer.getId() + ")");
            System.out.println("💰 เงินจำนวน $" + amount + " จะเข้า Firm Account เร็วๆ นี้");

        } catch (Exception e) {
            System.err.println("❌ เติมเงินไม่สำเร็จ: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void cancelOrderForAccount(UUID accountId, String orderId) throws Exception {
        log.info("cancelOrderForAccount accountId: " + accountId + " orderId: " + orderId);

        brokerAPI().broker().trading().deleteOrderForAccount(
                accountId,
                orderId
        );

    }

    public Order getSingleOrder(UUID accountId, String orderId) throws Exception {
        log.info("OrderService: Retrieving single order {} for account {}", orderId, accountId);

        return brokerAPI().broker().trading().getOrderForAccount(
                accountId,
                orderId
        );
    }

    public List<Order> getAllOrders(UUID accountId,String status , Integer limit ,String symbols) throws Exception {
        log.info("getAllOrders accountId: " + accountId);
        log.info("getAllOrders status: " + status);
        log.info("getAllOrders limit: " + limit);
        return brokerAPI().broker().trading().getAllOrdersForAccount(
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
        log.info("getAccount accountId: " + accountId);
        try {
            return brokerAPI().broker().accounts().getTradingAccount(accountId);
        } catch (ApiException e) {
            log.error("getAccount accountId: " + accountId, e);
            throw new RuntimeException(e);
        }
    }
}
