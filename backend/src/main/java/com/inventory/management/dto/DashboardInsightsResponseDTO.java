package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardInsightsResponseDTO {
    private List<ProductMovementInsightDTO> fastMovingProducts;
    private List<ProductMovementInsightDTO> slowMovingProducts;
    private List<ReorderSuggestionDTO> reorderSuggestions;
}