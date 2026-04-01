package com.inventory.management.service;

import com.inventory.management.dto.AiDemandDailyUsageDTO;
import com.inventory.management.dto.AiDemandPredictionDTO;
import com.inventory.management.dto.AiDemandProductUsageDTO;
import com.inventory.management.dto.AiDemandRequestDTO;
import com.inventory.management.dto.AiDemandResponseDTO;
import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.model.Product;
import com.inventory.management.repository.InventoryTransactionRepository;
import com.inventory.management.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class AiDemandPredictionService {

    private static final int HISTORY_WINDOW_DAYS = 30;
    private static final int PREDICTION_WINDOW_DAYS = 7;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @Autowired
    private OpenAiService openAiService;

    public List<AiDemandPredictionDTO> getAiDemandPredictions() {
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(HISTORY_WINDOW_DAYS - 1L);
        LocalDateTime since = fromDate.atStartOfDay();

        Map<String, Map<LocalDate, Integer>> dailyUsageByProduct = buildDailyUsageMap(since);

        List<Product> products = productRepository.findByActiveTrue();
        AiDemandRequestDTO request = buildRequest(products, dailyUsageByProduct, fromDate, today);

        Optional<AiDemandResponseDTO> aiResponseOpt = openAiService.predictDemand(request);
        Map<String, AiDemandPredictionDTO> aiByProductId = indexPredictions(aiResponseOpt.orElse(null));

        return products.stream()
                .filter(Objects::nonNull)
                .map(product -> mergeOrFallback(product, aiByProductId.get(product.getId()), dailyUsageByProduct.get(product.getId()), fromDate, today))
                .sorted(Comparator.comparingDouble(AiDemandPredictionDTO::getPredicted7Days).reversed()
                        .thenComparing(AiDemandPredictionDTO::getProductName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private Map<String, Map<LocalDate, Integer>> buildDailyUsageMap(LocalDateTime since) {
        List<InventoryTransaction> txs = transactionRepository.findByTransactionDateGreaterThanEqual(since);

        Map<String, Map<LocalDate, Integer>> dailyUsageByProduct = new HashMap<>();

        for (InventoryTransaction tx : txs) {
            if (tx == null) continue;
            if (tx.getTransactionDate() == null) continue;

            String productId = tx.getProductId();
            if (productId == null || productId.isBlank()) continue;

            String type = String.valueOf(tx.getTransactionType()).toUpperCase(Locale.ROOT);
            if (!"OUT".equals(type)) continue;

            LocalDate day = tx.getTransactionDate().toLocalDate();
            int qty = Math.max(tx.getQuantity(), 0);

            dailyUsageByProduct
                    .computeIfAbsent(productId, ignored -> new HashMap<>())
                    .merge(day, qty, (a, b) -> a + b);
        }

        return dailyUsageByProduct;
    }

    private AiDemandRequestDTO buildRequest(
            List<Product> products,
            Map<String, Map<LocalDate, Integer>> dailyUsageByProduct,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        List<AiDemandProductUsageDTO> usage = new ArrayList<>();

        for (Product product : products) {
            if (product == null) continue;
            if (product.getId() == null || product.getId().isBlank()) continue;

            Map<LocalDate, Integer> dailyMap = dailyUsageByProduct.getOrDefault(product.getId(), Map.of());
            List<AiDemandDailyUsageDTO> days = new ArrayList<>(HISTORY_WINDOW_DAYS);

            LocalDate d = fromDate;
            while (!d.isAfter(toDate)) {
                int qty = dailyMap.getOrDefault(d, 0);
                days.add(new AiDemandDailyUsageDTO(d, qty));
                d = d.plusDays(1);
            }

            usage.add(new AiDemandProductUsageDTO(
                    product.getId(),
                    safeName(product.getName()),
                    product.getUnit(),
                    days
            ));
        }

        return new AiDemandRequestDTO(HISTORY_WINDOW_DAYS, PREDICTION_WINDOW_DAYS, usage);
    }

    private Map<String, AiDemandPredictionDTO> indexPredictions(AiDemandResponseDTO response) {
        Map<String, AiDemandPredictionDTO> map = new HashMap<>();
        if (response == null || response.getPredictions() == null) return map;

        for (AiDemandPredictionDTO p : response.getPredictions()) {
            if (p == null) continue;
            if (p.getProductId() == null || p.getProductId().isBlank()) continue;
            map.put(p.getProductId(), p);
        }

        return map;
    }

    private AiDemandPredictionDTO mergeOrFallback(
            Product product,
            AiDemandPredictionDTO ai,
            Map<LocalDate, Integer> dailyMap,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        FallbackStats stats = computeFallbackStats(dailyMap, fromDate, toDate);

        String id = product.getId();
        String name = safeName(product.getName());

        double avgDaily = stats.avgDaily;
        double predicted = stats.predicted7;
        String trend = stats.trend;

        if (ai != null) {
            if (Double.isFinite(ai.getPredicted7Days()) && ai.getPredicted7Days() >= 0) {
                predicted = ai.getPredicted7Days();
            }
            if (isValidTrend(ai.getTrend())) {
                trend = ai.getTrend().trim().toUpperCase(Locale.ROOT);
            }
        }

        return new AiDemandPredictionDTO(id, name, avgDaily, predicted, trend);
    }

    private FallbackStats computeFallbackStats(Map<LocalDate, Integer> dailyMap, LocalDate fromDate, LocalDate toDate) {
        Map<LocalDate, Integer> map = dailyMap == null ? Map.of() : dailyMap;

        int total = 0;
        LocalDate d = fromDate;
        while (!d.isAfter(toDate)) {
            total += Math.max(map.getOrDefault(d, 0), 0);
            d = d.plusDays(1);
        }

        double avgDaily = total <= 0 ? 0.0 : (total / (double) HISTORY_WINDOW_DAYS);
        double predicted7 = avgDaily * PREDICTION_WINDOW_DAYS;

        int last7 = sumDays(map, toDate.minusDays(6), toDate);
        int prev7 = sumDays(map, toDate.minusDays(13), toDate.minusDays(7));

        String trend;
        if (prev7 <= 0 && last7 <= 0) {
            trend = "FLAT";
        } else if (prev7 <= 0) {
            trend = "UP";
        } else {
            double ratio = last7 / (double) prev7;
            if (ratio >= 1.10) trend = "UP";
            else if (ratio <= 0.90) trend = "DOWN";
            else trend = "FLAT";
        }

        return new FallbackStats(avgDaily, predicted7, trend);
    }

    private int sumDays(Map<LocalDate, Integer> map, LocalDate from, LocalDate to) {
        int sum = 0;
        LocalDate d = from;
        while (!d.isAfter(to)) {
            sum += Math.max(map.getOrDefault(d, 0), 0);
            d = d.plusDays(1);
        }
        return sum;
    }

    private String safeName(String name) {
        return name == null || name.isBlank() ? "-" : name;
    }

    private boolean isValidTrend(String trend) {
        if (trend == null || trend.isBlank()) {
            return false;
        }
        String t = trend.trim().toUpperCase(Locale.ROOT);
        return "UP".equals(t) || "DOWN".equals(t) || "FLAT".equals(t);
    }

    private record FallbackStats(double avgDaily, double predicted7, String trend) {
    }
}
