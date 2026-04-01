package com.inventory.management.service;

import com.inventory.management.dto.PurchaseOrderDTO;
import com.inventory.management.dto.ReorderSuggestionDTO;
import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.model.Product;
import com.inventory.management.model.PurchaseOrder;
import com.inventory.management.repository.InventoryTransactionRepository;
import com.inventory.management.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReorderService {

    private static final int ANALYSIS_WINDOW_DAYS = 30;
    private static final int DEFAULT_LEAD_TIME_DAYS = 5;

    @Autowired private ProductRepository productRepository;
    @Autowired private InventoryTransactionRepository transactionRepository;
    @Autowired private PurchaseOrderService purchaseOrderService;

    public List<ReorderSuggestionDTO> getReorderSuggestions() {
        return computeReorderSuggestions().stream()
                .sorted(Comparator.comparingInt(ReorderSuggestionDTO::getSuggestedReorderQuantity).reversed())
                .toList();
    }

    public List<ReorderSuggestionDTO> getTopReorderSuggestions(int limit) {
        return getReorderSuggestions().stream()
                .limit(Math.max(limit, 0))
                .toList();
    }

    public PurchaseOrder createOrderFromSuggestion(String productId) {
        String safeProductId = Objects.requireNonNull(productId, "Product ID is required");

        Product product = productRepository.findById(safeProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + safeProductId));

        if (!product.isActive()) {
            throw new RuntimeException("Cannot create reorder for inactive product: " + product.getName());
        }

        ReorderSuggestionDTO suggestion = getReorderSuggestionForProduct(safeProductId)
                .orElseThrow(() -> new RuntimeException("No reorder required for product: " + product.getName()));

        if (product.getVendorId() == null || product.getVendorId().isBlank()) {
            throw new RuntimeException("Vendor is required to create purchase order for product: " + product.getName());
        }

        BigDecimal unitPrice = resolveUnitPrice(product);

        PurchaseOrderDTO dto = new PurchaseOrderDTO();
        dto.setVendorId(product.getVendorId());
        dto.setExpectedDeliveryDate(LocalDateTime.now().plusDays(suggestion.getLeadTimeDays()));
        dto.setNotes("Auto-created from reorder suggestion for " + product.getName());

        PurchaseOrderDTO.OrderItemDTO item = new PurchaseOrderDTO.OrderItemDTO();
        item.setProductId(product.getId());
        item.setQuantity(suggestion.getSuggestedReorderQuantity());
        item.setUnitPrice(unitPrice);
        dto.setItems(List.of(item));

        return purchaseOrderService.createOrder(dto);
    }

    private Optional<ReorderSuggestionDTO> getReorderSuggestionForProduct(String productId) {
        return computeReorderSuggestions().stream()
                .filter(s -> s.getProductId().equals(productId))
                .findFirst();
    }

    private List<ReorderSuggestionDTO> computeReorderSuggestions() {
        LocalDateTime since = LocalDateTime.now().minusDays(ANALYSIS_WINDOW_DAYS);

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
                .map(product -> buildSuggestion(product, consumedByProduct.getOrDefault(product.getId(), 0)))
                .flatMap(Optional::stream)
                .toList();
    }

    private Optional<ReorderSuggestionDTO> buildSuggestion(Product product, int consumedQty) {
        if (consumedQty <= 0) {
            return Optional.empty();
        }

        int leadTime = product.getLeadTime() > 0 ? product.getLeadTime() : DEFAULT_LEAD_TIME_DAYS;
        int currentStock = Math.max(product.getQuantity(), 0);
        double avgDailyUsage = consumedQty / (double) ANALYSIS_WINDOW_DAYS;
        int reorderQty = (int) Math.ceil((avgDailyUsage * leadTime) - currentStock);

        if (reorderQty <= 0) {
            return Optional.empty();
        }

        int requiredStock = currentStock + reorderQty;

        return Optional.of(new ReorderSuggestionDTO(
                product.getId(),
                product.getName(),
                product.getSku(),
                currentStock,
                avgDailyUsage,
                leadTime,
                requiredStock,
                reorderQty
        ));
    }

    private BigDecimal resolveUnitPrice(Product product) {
        if (product.getCostPrice() != null && product.getCostPrice().compareTo(BigDecimal.ZERO) > 0) {
            return product.getCostPrice();
        }

        if (product.getPrice() != null && product.getPrice().compareTo(BigDecimal.ZERO) > 0) {
            return product.getPrice();
        }

        throw new RuntimeException("Product price is required to create purchase order for: " + product.getName());
    }
}
