package com.inventory.management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiDemandRequestDTO {
    private int historyWindowDays;
    private int predictionWindowDays;
    private List<AiDemandProductUsageDTO> products;
}
