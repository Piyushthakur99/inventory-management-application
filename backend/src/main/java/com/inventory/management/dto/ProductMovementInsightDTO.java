package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductMovementInsightDTO {
    private String productId;
    private String productName;
    private String sku;
    private int transactionCount;
    private int quantityMoved;
}