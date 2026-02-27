package com.alpaca.web.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class FinnhubProfileDTO {
    @JsonProperty("name")
    private String name; // ได้ชื่อเต็มบริษัทด้วย!

    @JsonProperty("finnhubIndustry")
    private String industry; // ตัวที่คุณต้องการ
}
