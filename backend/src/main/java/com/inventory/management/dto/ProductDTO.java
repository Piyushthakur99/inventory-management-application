package com.inventory.management.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductDTO {

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;

    @NotBlank(message = "SKU is required")
    private String sku;

    private String categoryId;
    private String vendorId;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal price;

    private BigDecimal costPrice;

    @Min(value = 0, message = "Quantity cannot be negative")
    private int quantity;

    @Min(value = 0, message = "Low stock threshold cannot be negative")
    private int lowStockThreshold = 10;

    private String unit; // pieces, kg, liters, boxes, etc.
}
