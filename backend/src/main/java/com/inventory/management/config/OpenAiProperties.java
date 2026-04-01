package com.inventory.management.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "openai")
public class OpenAiProperties {
    /**
     * Enables OpenAI demand prediction. If disabled or apiKey is blank, the app falls back
     * to the local calculation (avg daily usage + simple trend).
     */
    private boolean enabled = false;

    /**
     * OpenAI API key. Provide via env var OPENAI_API_KEY.
     */
    private String apiKey;

    /**
     * Base URL for OpenAI API.
     */
    private String baseUrl = "https://api.openai.com/v1";

    /**
     * GPT model name (e.g. gpt-4.1-mini).
     */
    private String model = "gpt-4.1-mini";

    /**
     * Request timeout in seconds.
     */
    private int timeoutSeconds = 20;
}
