package com.inventory.management.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "inventory_transactions")
public class InventoryTransaction {

    @Id
    private String id;

    private String productId;
    private String productName;

    private String transactionType; // IN | OUT | ADJUSTMENT
    private int quantity;           // absolute change amount
    private int previousQuantity;
    private int newQuantity;

    private String reason;
    private String performedBy;     // username
    private String referenceId;     // e.g. purchase order ID

    private LocalDateTime transactionDate;
}
