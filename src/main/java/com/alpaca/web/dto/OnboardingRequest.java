package com.alpaca.web.dto;
import lombok.Data;

@Data
public class OnboardingRequest {
    private String email;
    private String traderType;
    private String riskBehavior;
}
