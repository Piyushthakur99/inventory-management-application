package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiDemandProductUsageDTO {
    private String productId;
    private String productName;
    private String unit;

    /**
     * Daily usage (consumption / OUT) for the last N days.
     */
    private List<AiDemandDailyUsageDTO> dailyUsage;
}
