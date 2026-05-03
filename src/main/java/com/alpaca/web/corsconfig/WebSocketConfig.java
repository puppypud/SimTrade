package com.alpaca.web.corsconfig;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


@Configuration
@EnableWebSocketMessageBroker // เปิดใช้งานระบบ Message Broker (STOMP)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // กำหนด Prefix สำหรับท่อส่งข้อมูลจาก Server ไป Client
        config.enableSimpleBroker("/topic");

        // กำหนด Prefix สำหรับ Client ส่งข้อมูลมา Server (ในเคสเราอาจจะยังไม่ได้ใช้ แต่ใส่เป็นมาตรฐานไว้)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // จุดเชื่อมต่อ (Endpoint) ที่หน้าบ้าน (Next.js) จะต้องใช้เพื่อเปิดท่อเชื่อมต่อเข้ามา
        registry.addEndpoint("/ws-alerts")
                .setAllowedOriginPatterns("*"); // อนุญาตให้เชื่อมต่อข้ามโดเมนได้ (CORS) ป้องกันปัญหาตอนเทสหน้าบ้าน
    }
}
