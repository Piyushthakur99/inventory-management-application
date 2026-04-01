package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TopVendorDTO {
    private String vendorId;
    private String vendorName;
    private int totalOrders;
    private BigDecimal totalSpending;
}
