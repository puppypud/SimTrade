package com.alpaca.web.Repository;

import com.alpaca.web.entity.FeedbackTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeedbackTemplateRepository extends JpaRepository<FeedbackTemplate, Long> {
    Optional<FeedbackTemplate> findByAlertType(String alertType);
}
