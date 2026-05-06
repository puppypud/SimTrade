package com.alpaca.web.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "feedback_template")
@Data
@NoArgsConstructor
public class FeedbackTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String alertType; 

    private String title; 
    
    @Column(columnDefinition = "TEXT")
    private String message; 
    
    private String severity; 
}
