package com.alpaca.web.dto;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateAccountRequest {
    private String email;      // ใช้เป็น Username
    private String password;
    private String firstName;
    private String lastName;
    private String phoneNumber;
}
