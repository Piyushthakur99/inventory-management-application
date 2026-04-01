package com.inventory.management.service;

import com.inventory.management.dto.DashboardInsightsResponseDTO;
import com.inventory.management.dto.ProductMovementInsightDTO;
import com.inventory.management.dto.ReorderSuggestionDTO;
import com.inventory.management.dto.TopProductDTO;
import com.inventory.management.dto.TopVendorDTO;
import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.model.PurchaseOrder;
import com.inventory.management.model.Product;
import com.inventory.management.repository.InventoryTransactionRepository;
import com.inventory.management.repository.ProductRepository;
import com.inventory.management.repository.PurchaseOrderRepository;
import com.inventory.management.repository.VendorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final int ANALYSIS_WINDOW_DAYS = 30;
    private static final int FAST_MOVING_LIMIT = 5;
    private static final int SLOW_MOVING_LIMIT = 5;
    private static final int REORDER_LIMIT = 10;
    private static final int SLOW_MOVING_TRANSACTION_THRESHOLD = 1;
        private static final int TOP_ANALYTICS_LIMIT = 5;

    @Autowired private ProductRepository productRepository;
    @Autowired private VendorRepository vendorRepository;
    @Autowired private PurchaseOrderRepository orderRepository;
    @Autowired private InventoryTransactionRepository transactionRepository;
    @Autowired private ProductService productService;
        @Autowired private ReorderService reorderService;

        public Map<String, Object> getDashboardStats(LocalDate from, LocalDate to) {
                DateRange range = resolveDateRange(from, to);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProducts",   productRepository.countByActiveTrue());
        stats.put("totalVendors",    vendorRepository.countByActiveTrue());

                List<PurchaseOrder> ordersInRange = orderRepository.findByOrderDateBetween(range.fromDateTime(), range.toDateTime());

                int totalOrders = ordersInRange.size();
                int pendingOrders = (int) ordersInRange.stream().filter(o -> "PENDING".equalsIgnoreCase(o.getStatus())).count();
                int receivedOrders = (int) ordersInRange.stream().filter(o -> "RECEIVED".equalsIgnoreCase(o.getStatus())).count();
                int cancelledOrders = (int) ordersInRange.stream().filter(o -> "CANCELLED".equalsIgnoreCase(o.getStatus())).count();

                BigDecimal totalSpending = ordersInRange.stream()
                                .map(PurchaseOrder::getTotalAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                stats.put("totalOrders", totalOrders);
                stats.put("pendingOrders", pendingOrders);
                stats.put("receivedOrders", receivedOrders);
                stats.put("cancelledOrders", cancelledOrders);
                stats.put("totalSpending", totalSpending);

                stats.put("topProducts", computeTopProducts(ordersInRange));
                stats.put("topVendors", computeTopVendors(ordersInRange));

                stats.put("rangeFrom", range.fromDate().toString());
                stats.put("rangeTo", range.toDate().toString());

        var lowStock = productService.getLowStockProducts();
        stats.put("lowStockCount", lowStock.size());
        stats.put("lowStockItems", lowStock);

        return stats;
    }

        public DashboardInsightsResponseDTO getDashboardInsights(LocalDate from, LocalDate to) {
                DateRange range = resolveDateRange(from, to);
        List<Product> activeProducts = productRepository.findByActiveTrue();

        Map<String, List<InventoryTransaction>> transactionsByProduct =
                                transactionRepository.findByTransactionDateBetween(range.fromDateTime(), range.toDateTime())
                        .stream()
                        .filter(this::isConsumptionTransaction)
                        .collect(Collectors.groupingBy(InventoryTransaction::getProductId));

        List<ProductMovementInsightDTO> fastMovingProducts = activeProducts.stream()
                .map(product -> toMovementInsight(product, transactionsByProduct.getOrDefault(product.getId(), List.of())))
                .filter(insight -> insight.getTransactionCount() > 0)
                .sorted(Comparator.comparingInt(ProductMovementInsightDTO::getTransactionCount)
                        .thenComparingInt(ProductMovementInsightDTO::getQuantityMoved)
                        .reversed())
                .limit(FAST_MOVING_LIMIT)
                .toList();

        List<ProductMovementInsightDTO> slowMovingProducts = activeProducts.stream()
                .map(product -> toMovementInsight(product, transactionsByProduct.getOrDefault(product.getId(), List.of())))
                .filter(insight -> insight.getTransactionCount() <= SLOW_MOVING_TRANSACTION_THRESHOLD)
                .sorted(Comparator.comparingInt(ProductMovementInsightDTO::getTransactionCount)
                        .thenComparingInt(ProductMovementInsightDTO::getQuantityMoved))
                .limit(SLOW_MOVING_LIMIT)
                .toList();

        List<ReorderSuggestionDTO> reorderSuggestions = reorderService.getTopReorderSuggestions(REORDER_LIMIT);

        return new DashboardInsightsResponseDTO(fastMovingProducts, slowMovingProducts, reorderSuggestions);
    }

        private DateRange resolveDateRange(LocalDate from, LocalDate to) {
                LocalDate end = (to != null) ? to : LocalDate.now();
                LocalDate start = (from != null) ? from : end.minusDays(ANALYSIS_WINDOW_DAYS - 1L);

                if (start.isAfter(end)) {
                        throw new IllegalArgumentException("from must be on or before to");
                }

                return new DateRange(
                                start.atStartOfDay(),
                                end.atTime(LocalTime.MAX),
                                start,
                                end
                );
        }

        private List<TopProductDTO> computeTopProducts(List<PurchaseOrder> ordersInRange) {
                Map<String, ProductAggregate> aggregates = new HashMap<>();

                for (PurchaseOrder order : ordersInRange) {
                        if (order == null || order.getItems() == null) {
                                continue;
                        }

                        for (PurchaseOrder.OrderItem item : order.getItems()) {
                                if (item == null || item.getProductId() == null) {
                                        continue;
                                }

                                String key = item.getProductId();
                                ProductAggregate agg = aggregates.computeIfAbsent(key, k -> new ProductAggregate(item.getProductId(), item.getProductName()));
                                agg.totalQuantity += Math.max(item.getQuantity(), 0);

                                BigDecimal itemTotal = item.getTotalPrice();
                                if (itemTotal == null && item.getUnitPrice() != null) {
                                        itemTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                                }
                                if (itemTotal != null) {
                                        agg.totalSpending = agg.totalSpending.add(itemTotal);
                                }
                        }
                }

                return aggregates.values().stream()
                                .sorted(Comparator.comparing((ProductAggregate a) -> a.totalSpending)
                                                .thenComparingInt(a -> a.totalQuantity)
                                                .reversed())
                                .limit(TOP_ANALYTICS_LIMIT)
                                .map(a -> new TopProductDTO(a.productId, a.productName, a.totalQuantity, a.totalSpending))
                                .toList();
        }

        private List<TopVendorDTO> computeTopVendors(List<PurchaseOrder> ordersInRange) {
                Map<String, VendorAggregate> aggregates = new HashMap<>();

                for (PurchaseOrder order : ordersInRange) {
                        if (order == null || order.getVendorId() == null) {
                                continue;
                        }

                        VendorAggregate agg = aggregates.computeIfAbsent(order.getVendorId(), k -> new VendorAggregate(order.getVendorId(), order.getVendorName()));
                        agg.totalOrders += 1;

                        BigDecimal amount = order.getTotalAmount();
                        if (amount != null) {
                                agg.totalSpending = agg.totalSpending.add(amount);
                        }
                }

                if (!aggregates.isEmpty()) {
                        Map<String, String> namesById = vendorRepository.findAllById(aggregates.keySet()).stream()
                                        .filter(Objects::nonNull)
                                        .collect(Collectors.toMap(
                                                        v -> v.getId(),
                                                        v -> v.getName() == null ? "" : v.getName(),
                                                        (a, b) -> a
                                        ));

                        aggregates.values().forEach(a -> {
                                if (a.vendorName == null || a.vendorName.isBlank()) {
                                        String name = namesById.get(a.vendorId);
                                        if (name != null && !name.isBlank()) {
                                                a.vendorName = name;
                                        }
                                }
                        });
                }

                return aggregates.values().stream()
                                .sorted(Comparator.comparing((VendorAggregate a) -> a.totalSpending)
                                                .thenComparingInt(a -> a.totalOrders)
                                                .reversed())
                                .limit(TOP_ANALYTICS_LIMIT)
                                .map(a -> new TopVendorDTO(a.vendorId, a.vendorName, a.totalOrders, a.totalSpending))
                                .toList();
        }

    private ProductMovementInsightDTO toMovementInsight(Product product, List<InventoryTransaction> transactions) {
        int quantityMoved = transactions.stream()
                .mapToInt(InventoryTransaction::getQuantity)
                .sum();

        return new ProductMovementInsightDTO(
                product.getId(),
                product.getName(),
                product.getSku(),
                transactions.size(),
                quantityMoved
        );
    }

    private boolean isConsumptionTransaction(InventoryTransaction tx) {
        if (tx.getProductId() == null || tx.getTransactionType() == null || tx.getTransactionDate() == null) {
            return false;
        }

        return "OUT".equalsIgnoreCase(tx.getTransactionType())
                || ("ADJUSTMENT".equalsIgnoreCase(tx.getTransactionType())
                && tx.getNewQuantity() < tx.getPreviousQuantity());
    }

        private record DateRange(LocalDateTime fromDateTime, LocalDateTime toDateTime, LocalDate fromDate, LocalDate toDate) {
        }

        private static class ProductAggregate {
                private final String productId;
                private final String productName;
                private int totalQuantity;
                private BigDecimal totalSpending = BigDecimal.ZERO;

                private ProductAggregate(String productId, String productName) {
                        this.productId = productId;
                        this.productName = productName;
                }
        }

        private static class VendorAggregate {
                private final String vendorId;
                private String vendorName;
                private int totalOrders;
                private BigDecimal totalSpending = BigDecimal.ZERO;

                private VendorAggregate(String vendorId, String vendorName) {
                        this.vendorId = vendorId;
                        this.vendorName = vendorName;
                }
        }
}
