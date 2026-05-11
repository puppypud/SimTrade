package com.alpaca.web.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUpdateUserRequest {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String status;       // ACTIVE / INACTIVE
    private String traderType;   // Day Trader / Swing Trader / Position Trader
    private String riskBehavior; // Conservative / Moderate / Aggressive
    private String role;         // USER / ADMIN
}
