package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemandPredictionDTO {
    private String productName;
    private double avgDailyUsage;
    private double predicted7Days;
}
