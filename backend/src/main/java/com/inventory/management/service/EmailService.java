package com.inventory.management.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    @Value("${app.email.from:}")
    private String fromAddress;

    @Value("${app.email.admin-recipients:}")
    private String adminRecipients;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendToAdmins(String subject, String body) {
        List<String> recipients = parseRecipients(adminRecipients);
        if (recipients.isEmpty()) {
            log.debug("Admin email recipients not configured; skipping email: {}", subject);
            return;
        }
        send(recipients, subject, body);
    }

    @Async
    public void send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return;
        }
        send(List.of(to), subject, body);
    }

    public void send(List<String> to, String subject, String body) {
        if (!emailEnabled) {
            log.debug("Email disabled; skipping email: {}", subject);
            return;
        }

        List<String> recipients = to == null ? List.of() : to.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();

        if (recipients.isEmpty()) {
            return;
        }

        // If mail isn't configured (common in dev), don't crash business flows.
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Email 'from' address not configured (app.email.from); skipping email: {}", subject);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            String[] toAddresses = recipients.stream().toArray(String[]::new);
            message.setTo(toAddresses);
            message.setSubject(subject == null ? "" : subject);
            message.setText(body == null ? "" : body);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Email send failed (subject='{}'): {}", subject, ex.getMessage());
        }
    }

    private List<String> parseRecipients(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }
}
