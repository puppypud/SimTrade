package com.alpaca.web.corsconfig;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // อนุญาตทุก Path
                .allowedOrigins("http://localhost:3000") // อนุญาตเฉพาะ Frontend ของคุณ
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS"); // อนุญาต Method ที่จำเป็น
    }
}
