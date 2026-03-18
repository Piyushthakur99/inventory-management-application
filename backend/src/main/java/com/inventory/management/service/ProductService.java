package com.inventory.management.service;

import com.inventory.management.dto.ProductDTO;
import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.model.Product;
import com.inventory.management.repository.InventoryTransactionRepository;
import com.inventory.management.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class ProductService {

    @Autowired private ProductRepository productRepository;
    @Autowired private InventoryTransactionRepository transactionRepository;

    public Product createProduct(ProductDTO dto) {
        if (productRepository.existsBySku(dto.getSku())) {
            throw new RuntimeException("SKU already exists: " + dto.getSku());
        }
        Product product = new Product();
        mapDtoToProduct(dto, product);
        product.setActive(true);
        product.setCreatedAt(LocalDateTime.now());
        return productRepository.save(product);
    }

    public Product updateProduct(String id, ProductDTO dto) {
        String safeId = Objects.requireNonNull(id, "Product ID is required");
        Product product = productRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + safeId));

        int oldQty = product.getQuantity();
        mapDtoToProduct(dto, product);
        product.setUpdatedAt(LocalDateTime.now());
        Product saved = productRepository.save(product);

        if (oldQty != dto.getQuantity()) {
            logTransaction(saved, "ADJUSTMENT",
                    Math.abs(dto.getQuantity() - oldQty), oldQty, dto.getQuantity(),
                    "Manual quantity update");
        }
        return saved;
    }

    public void deleteProduct(String id) {
        String safeId = Objects.requireNonNull(id, "Product ID is required");
        Product product = productRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + safeId));
        product.setActive(false);
        productRepository.save(product);
    }

    public Page<Product> getAllProducts(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        if (search != null && !search.isBlank()) {
            return productRepository.findByNameContainingIgnoreCaseAndActiveTrue(search, pageable);
        }
        return productRepository.findByActiveTrue(pageable);
    }

    public Product getProductById(String id) {
        String safeId = Objects.requireNonNull(id, "Product ID is required");
        return productRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + safeId));
    }

    public List<Product> getLowStockProducts() {
        return productRepository.findAll().stream()
                .filter(p -> p.isActive() && p.getQuantity() <= p.getLowStockThreshold())
                .toList();
    }

    public Product updateStock(String id, int quantityChange, String reason) {
        String safeId = Objects.requireNonNull(id, "Product ID is required");
        Product product = productRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + safeId));

        int oldQty = product.getQuantity();
        int newQty = oldQty + quantityChange;

        if (newQty < 0) {
            throw new RuntimeException("Insufficient stock. Available: " + oldQty);
        }

        product.setQuantity(newQty);
        product.setUpdatedAt(LocalDateTime.now());
        Product saved = productRepository.save(product);

        String type = quantityChange > 0 ? "IN" : "OUT";
        logTransaction(saved, type, Math.abs(quantityChange), oldQty, newQty, reason);

        return saved;
    }

    private void mapDtoToProduct(ProductDTO dto, Product product) {
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setSku(dto.getSku());
        product.setCategoryId(dto.getCategoryId());
        product.setVendorId(dto.getVendorId());
        product.setPrice(dto.getPrice());
        product.setCostPrice(dto.getCostPrice());
        product.setQuantity(dto.getQuantity());
        product.setLowStockThreshold(dto.getLowStockThreshold());
        product.setUnit(dto.getUnit());
    }

    private void logTransaction(Product product, String type, int qty,
                                 int prev, int next, String reason) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        InventoryTransaction tx = new InventoryTransaction();
        tx.setProductId(product.getId());
        tx.setProductName(product.getName());
        tx.setTransactionType(type);
        tx.setQuantity(qty);
        tx.setPreviousQuantity(prev);
        tx.setNewQuantity(next);
        tx.setReason(reason);
        tx.setPerformedBy(auth != null ? auth.getName() : "system");
        tx.setTransactionDate(LocalDateTime.now());
        transactionRepository.save(tx);
    }
}
