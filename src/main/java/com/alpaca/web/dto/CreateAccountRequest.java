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
    // 1. ข้อมูลพื้นฐาน (Basic Info)
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private String phoneNumber;

    // 2. ข้อมูลที่อยู่ (Address)
    private List<String> streetAddress;
    private String city;
    private String state;
    private String postalCode;

    // 3. ข้อมูลยืนยันตัวตนและภาษี (Identity & Tax)
    private LocalDate dateOfBirth; // รูปแบบจาก Frontend ควรเป็น "YYYY-MM-DD"
    private String taxId;
    private String taxIdType; // เช่น "USA_SSN"
    private String countryOfCitizenship;
    private String countryOfBirth;
    private String countryOfTaxResidence;

    // 4. ข้อมูลการเปิดเผย (Disclosures - ปกติจะเป็น Checkbox ในหน้าสมัคร)
    private boolean isControlPerson;
    private boolean isAffiliatedExchangeOrFinra;
    private boolean isPoliticallyExposed;
    private boolean immediateFamilyExposed;
}
