package com.inventory.management.service;

import com.inventory.management.dto.PurchaseOrderDTO;
import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.Product;
import com.inventory.management.model.PurchaseOrder;
import com.inventory.management.repository.ProductRepository;
import com.inventory.management.repository.PurchaseOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PurchaseOrderService {

    @Autowired private PurchaseOrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductService productService;

    public PurchaseOrder createOrder(PurchaseOrderDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        PurchaseOrder order = new PurchaseOrder();
        order.setOrderNumber(generateOrderNumber());
        order.setVendorId(dto.getVendorId());
        order.setCreatedBy(auth.getName());
        order.setStatus("PENDING");
        order.setOrderDate(LocalDateTime.now());
        order.setExpectedDeliveryDate(dto.getExpectedDeliveryDate());
        order.setNotes(dto.getNotes());

        List<PurchaseOrder.OrderItem> items = dto.getItems().stream().map(i -> {
            String productId = Objects.requireNonNull(i.getProductId(), "Product ID is required");
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found: " + productId));
            PurchaseOrder.OrderItem item = new PurchaseOrder.OrderItem();
            item.setProductId(productId);
            item.setProductName(product.getName());
            item.setQuantity(i.getQuantity());
            item.setUnitPrice(i.getUnitPrice());
            item.setTotalPrice(i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())));
            return item;
        }).collect(Collectors.toList());

        order.setItems(items);
        order.setTotalAmount(items.stream()
                .map(PurchaseOrder.OrderItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        return orderRepository.save(order);
    }

    public PurchaseOrder updateStatus(String id, String status) {
        String safeId = Objects.requireNonNull(id, "Order ID is required");
        PurchaseOrder order = orderRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + safeId));

        order.setStatus(status);

        if ("RECEIVED".equals(status)) {
            order.setReceivedDate(LocalDateTime.now());
            for (PurchaseOrder.OrderItem item : order.getItems()) {
                String productId = Objects.requireNonNull(item.getProductId(), "Product ID is required");
                productService.updateStock(
                        productId,
                        item.getQuantity(),
                        "Purchase Order: " + order.getOrderNumber()
                );
            }
        }

        return orderRepository.save(order);
    }

    public List<PurchaseOrder> getAllOrders() {
        return orderRepository.findAll();
    }

    public PurchaseOrder getOrderById(String id) {
        String safeId = Objects.requireNonNull(id, "Order ID is required");
        return orderRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + safeId));
    }

    public List<PurchaseOrder> getOrdersByStatus(String status) {
        return orderRepository.findByStatus(status);
    }

    private String generateOrderNumber() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "PO-" + date + "-" + suffix;
    }
}
