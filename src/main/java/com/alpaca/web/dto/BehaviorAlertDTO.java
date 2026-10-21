package com.alpaca.web.dto;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class BehaviorAlertDTO {

    private String alertType;      // เช่น "FOMO", "SELL_EARLY", "PANIC_SELL"
    private String title;          // หัวข้อ Popup เช่น "แจ้งเตือนพฤติกรรมเสี่ยง!"
    private String message;        // ข้อความรายละเอียด
    private String severity;       // ความรุนแรง เช่น "WARNING", "DANGER" (เอาไปกำหนดสี Popup)
    private LocalDateTime timestamp;

    // Constructors
    public BehaviorAlertDTO(String alertType, String title, String message, String severity) {
        this.alertType = alertType;
        this.title = title;
        this.message = message;
        this.severity = severity;
        this.timestamp = LocalDateTime.now();
    }

}
