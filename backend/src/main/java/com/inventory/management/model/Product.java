package com.inventory.management.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    private String name;
    private String description;
    private String sku;          // Stock Keeping Unit - unique identifier
    private String categoryId;
    private String vendorId;

    private BigDecimal price;     // selling price
    private BigDecimal costPrice; // purchase/cost price

    private int quantity;
    private int lowStockThreshold; // alert when quantity <= this

    private String unit;           // pieces, kg, liters, boxes, etc.
    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
