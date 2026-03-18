package com.inventory.management.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseOrderDTO {

    @NotBlank(message = "Vendor ID is required")
    private String vendorId;

    @NotEmpty(message = "Order must have at least one item")
    private List<OrderItemDTO> items;

    private LocalDateTime expectedDeliveryDate;
    private String notes;

    @Data
    public static class OrderItemDTO {

        @NotBlank(message = "Product ID is required")
        private String productId;

        @Min(value = 1, message = "Quantity must be at least 1")
        private int quantity;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
        private BigDecimal unitPrice;
    }
}
