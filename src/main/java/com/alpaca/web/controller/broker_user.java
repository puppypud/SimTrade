package com.alpaca.web.controller;

import com.alpaca.web.Service.BrokerService;
import com.alpaca.web.Service.MarketDataService;
import net.jacobpeterson.alpaca.openapi.marketdata.ApiException;
import net.jacobpeterson.alpaca.openapi.marketdata.model.StockBar;
import org.slf4j.Logger;
import net.jacobpeterson.alpaca.AlpacaAPI;
import net.jacobpeterson.alpaca.openapi.broker.model.*; // Import ของ Alpaca
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("broker")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost"})
public class broker_user {

    private final Logger log = LoggerFactory.getLogger(broker_user.class);
    private final BrokerService brokerService;       // แนะนำให้ใช้ตัวเล็กนำหน้า (camelCase)
    private final MarketDataService marketDataService; // 1. เพิ่มตัวแปร Service

    // 2. เพิ่มใน Constructor ให้ Spring ส่งเข้ามาให้  ต้องประกาศ@Service
    public broker_user( BrokerService brokerService, MarketDataService marketDataService) {
        this.brokerService = brokerService;
        this.marketDataService = marketDataService;
    }


    @PostMapping("/order/user")
    public ResponseEntity <?> buyStockForUser(
        @RequestParam("accountId") UUID accountId,
        @RequestParam("symbol") String symbol,
        @RequestParam("qty") BigDecimal qty,
        @RequestParam("OrderSide")String orderSideStr,
        @RequestParam("OrderType")String orderTypeStr,
        @RequestParam("TimeInForce")String timeInForceStr) throws Exception{

        try {
            OrderSide side = OrderSide.valueOf(orderSideStr);
            OrderType type = OrderType.valueOf(orderTypeStr);
            TimeInForce Time = TimeInForce.valueOf(timeInForceStr);

            log.info("OrderSide "+side+" "+type+" "+Time);
            log.info("order is "+side+" "+" to account is " + accountId);

            Order order = brokerService.createOrder(
                    accountId,
                    symbol.toUpperCase(),
                    qty,
                    side,
                    type,
                    Time
            );
            return ResponseEntity.ok("Order created successfully"+order.toString());
        }catch (Exception e){
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("error"+e.getMessage());
        }
    }

    @PostMapping("/order/cancel")
    public ResponseEntity <?> cancelOrderForAccount(
            @RequestParam("accountId") UUID accountId,
            @RequestParam("orderId")  String orderId){
        log.info("cancelOrderForAccount accountId: " + accountId + " orderId: " + orderId);
        try{
            brokerService.cancelOrderForAccount(accountId, orderId);
            return ResponseEntity.ok("order successfully cancelled" + orderId);
        }catch (Exception e){
            log.error("error"+e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ Cancellation Failed. Error: " + e.getMessage());
        }
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity <?> getSingleOrder(
            @RequestParam("accountId")UUID accountId,
            @PathVariable("orderId") String orderId
    ){
        try {
            getSingleOrder(accountId, orderId);
            return ResponseEntity.ok("order successfully getting" + orderId);
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ Order ID: " + orderId + " not found. Error: " + e.getMessage());
        }

    }

    @GetMapping("/order/get/all-order")
    public ResponseEntity <?> getAllOrders(
            @RequestParam("accountId") UUID accountId,
            @RequestParam(value = "status", required = false,defaultValue = "all") String status,
            @RequestParam(value = "limit", required = false,defaultValue = "50" ) Integer limit,
            @RequestParam(value = "symbols", required = false) String symbols

    ){

        try {

            List<Order> orders = brokerService.getAllOrders(accountId,status,limit,symbols);
            return ResponseEntity.ok(orders);
        }catch (Exception e){
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
            List<StockBar> stockBars = marketDataService.getStockBars(symbols,viewType);
            return ResponseEntity.ok(stockBars);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Server Error: " + e.getMessage());
        }
    }
}
