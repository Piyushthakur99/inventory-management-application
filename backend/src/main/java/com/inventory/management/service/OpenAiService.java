package com.inventory.management.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventory.management.config.OpenAiProperties;
import com.inventory.management.dto.AiDemandProductUsageDTO;
import com.inventory.management.dto.AiDemandRequestDTO;
import com.inventory.management.dto.AiDemandResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class OpenAiService {

    @Autowired
    private OpenAiProperties properties;

    @Autowired
    private RestTemplateBuilder restTemplateBuilder;

    @Autowired
    private ObjectMapper objectMapper;

    public Optional<AiDemandResponseDTO> predictDemand(AiDemandRequestDTO request) {
        String apiKey = properties.getApiKey();
        if (!properties.isEnabled()) {
            log.info("OpenAI integration disabled (openai.enabled=false)");
            return Optional.empty();
        }
        if (!StringUtils.hasText(apiKey)) {
            log.warn("OpenAI integration enabled but API key is missing (openai.api-key is blank)");
            return Optional.empty();
        }

        try {
            RestTemplate restTemplate = restTemplateBuilder
                    .setConnectTimeout(Duration.ofSeconds(Math.max(properties.getTimeoutSeconds(), 5)))
                    .setReadTimeout(Duration.ofSeconds(Math.max(properties.getTimeoutSeconds(), 5)))
                    .build();

            String url = normalizeBaseUrl(properties.getBaseUrl()) + "/chat/completions";
            log.info("Calling OpenAI chat.completions (model={}, baseUrl={})", properties.getModel(), normalizeBaseUrl(properties.getBaseUrl()));

            String prompt = buildPrompt(request);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", properties.getModel());
            body.put("temperature", 0.2);
            body.put("messages", List.of(
                    Map.of("role", "system", "content", systemInstruction()),
                    Map.of("role", "user", "content", prompt)
            ));
            body.put("response_format", Map.of("type", "json_object"));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ResponseEntity<String> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("OpenAI returned non-success status: {}", response.getStatusCode());
                return Optional.empty();
            }

            String content = extractAssistantContent(response.getBody());
            if (!StringUtils.hasText(content)) {
                log.warn("OpenAI response missing assistant content");
                return Optional.empty();
            }

            AiDemandResponseDTO parsed = objectMapper.readValue(content, AiDemandResponseDTO.class);
            int count = (parsed == null || parsed.getPredictions() == null) ? 0 : parsed.getPredictions().size();
            log.info("OpenAI response parsed successfully (predictions={})", count);
            return Optional.ofNullable(parsed);
        } catch (Exception ex) {
            log.warn("OpenAI call failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String normalizeBaseUrl(String baseUrl) {
        String url = (baseUrl == null) ? "" : baseUrl.trim();
        if (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        if (url.isBlank()) {
            return "https://api.openai.com/v1";
        }
        return url;
    }

    private String extractAssistantContent(String rawJson) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(rawJson);
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            return null;
        }

        // chat.completions shape: choices[0].message.content
        JsonNode content = choices.get(0).path("message").path("content");
        if (content.isMissingNode() || content.isNull()) {
            return null;
        }

        String text = content.asText();
        return text == null ? null : text.trim();
    }

    private String systemInstruction() {
        return "You are an inventory demand forecasting assistant. "
                + "You will receive last 30 days of daily consumption (OUT) per product. "
                + "Return ONLY valid JSON (no markdown) in this exact shape: "
                + "{\"predictions\":[{\"productId\":\"...\",\"predicted7Days\":number,\"trend\":\"UP|DOWN|FLAT\"}]}. "
                + "Rules: predicted7Days must be >= 0. Provide one prediction for every productId given.";
    }

    private String buildPrompt(AiDemandRequestDTO request) throws JsonProcessingException {
        int historyDays = request == null ? 30 : request.getHistoryWindowDays();
        int predictDays = request == null ? 7 : request.getPredictionWindowDays();
        List<AiDemandProductUsageDTO> products = request == null ? List.of() : safeList(request.getProducts());

        // Keep prompt compact: per product include id, name, and an integer array of daily usage.
        List<Map<String, Object>> compact = products.stream().map(p -> {
            List<Integer> series = safeList(p.getDailyUsage()).stream()
                    .map(d -> d == null ? 0 : Math.max(d.getQuantity(), 0))
                    .toList();
            return Map.of(
                    "productId", p.getProductId(),
                    "productName", p.getProductName(),
                    "dailyUsage", series
            );
        }).toList();

        Map<String, Object> payload = Map.of(
                "historyWindowDays", historyDays,
                "predictionWindowDays", predictDays,
                "products", compact
        );

        return "Forecast next " + predictDays + " days demand per product. "
                + "Use the last " + historyDays + " days daily usage series. "
                + "Data: " + objectMapper.writeValueAsString(payload);
    }

    private <T> List<T> safeList(List<T> list) {
        return list == null ? List.of() : list;
    }
}
