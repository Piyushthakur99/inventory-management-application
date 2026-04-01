package com.inventory.management.service;

import com.inventory.management.dto.DemandPredictionDTO;
import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.model.Product;
import com.inventory.management.repository.InventoryTransactionRepository;
import com.inventory.management.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class DemandPredictionService {

    private static final int HISTORY_WINDOW_DAYS = 30;
    private static final int PREDICTION_WINDOW_DAYS = 7;

    @Autowired private ProductRepository productRepository;
    @Autowired private InventoryTransactionRepository transactionRepository;

    public List<DemandPredictionDTO> getDemandPredictions() {
        LocalDateTime since = LocalDateTime.now().minusDays(HISTORY_WINDOW_DAYS);

        Map<String, Integer> consumedByProduct = transactionRepository
                .findByTransactionDateGreaterThanEqual(since)
                .stream()
                .filter(Objects::nonNull)
                .filter(tx -> tx.getProductId() != null)
                .filter(tx -> tx.getTransactionType() != null)
                .filter(tx -> "OUT".equalsIgnoreCase(tx.getTransactionType()))
                .collect(Collectors.groupingBy(
                        InventoryTransaction::getProductId,
                        Collectors.summingInt(tx -> Math.max(tx.getQuantity(), 0))
                ));

        return productRepository.findByActiveTrue().stream()
                .filter(Objects::nonNull)
                .map(product -> toPrediction(product, consumedByProduct.getOrDefault(product.getId(), 0)))
                .sorted(Comparator.comparingDouble(DemandPredictionDTO::getPredicted7Days).reversed()
                        .thenComparing(DemandPredictionDTO::getProductName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private DemandPredictionDTO toPrediction(Product product, int consumedQty) {
        double avgDailyUsage = consumedQty <= 0 ? 0.0 : (consumedQty / (double) HISTORY_WINDOW_DAYS);
        double predicted7Days = avgDailyUsage * PREDICTION_WINDOW_DAYS;

        String name = product.getName() == null ? "-" : product.getName();
        return new DemandPredictionDTO(name, avgDailyUsage, predicted7Days);
    }
}
