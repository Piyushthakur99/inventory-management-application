package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReorderSuggestionDTO {
    private String productId;
    private String productName;
    private String sku;
    private int currentStock;
    private double averageDailyUsage;
    private int leadTimeDays;
    private int requiredStock;
    private int suggestedReorderQuantity;
}