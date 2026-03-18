package com.inventory.management.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "purchase_orders")
public class PurchaseOrder {

    @Id
    private String id;

    private String orderNumber;   // e.g. PO-20240101-ABC123
    private String vendorId;
    private String vendorName;
    private String createdBy;     // username of creator

    private List<OrderItem> items; // embedded documents

    private BigDecimal totalAmount;

    // PENDING | APPROVED | RECEIVED | CANCELLED
    private String status;

    private LocalDateTime orderDate;
    private LocalDateTime expectedDeliveryDate;
    private LocalDateTime receivedDate;
    private String notes;

    @Data
    public static class OrderItem {
        private String productId;
        private String productName;
        private int quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }
}
