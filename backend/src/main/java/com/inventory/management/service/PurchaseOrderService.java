package com.inventory.management.service;

import com.inventory.management.dto.PurchaseOrderDTO;
import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.Product;
import com.inventory.management.model.PurchaseOrder;
import com.inventory.management.model.User;
import com.inventory.management.model.Vendor;
import com.inventory.management.repository.ProductRepository;
import com.inventory.management.repository.PurchaseOrderRepository;
import com.inventory.management.repository.UserRepository;
import com.inventory.management.repository.VendorRepository;
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
    @Autowired private ActivityLogService activityLogService;
    @Autowired private VendorRepository vendorRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private EmailService emailService;

    public PurchaseOrder createOrder(PurchaseOrderDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        String vendorId = Objects.requireNonNull(dto.getVendorId(), "Vendor ID is required");
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + vendorId));

        PurchaseOrder order = new PurchaseOrder();
        order.setOrderNumber(generateOrderNumber());
        order.setVendorId(vendorId);
        order.setVendorName(vendor.getName());
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

        PurchaseOrder saved = orderRepository.save(order);

        String message = "Purchase order created: " + saved.getOrderNumber() + " (" + saved.getItems().size() + " item(s))";
        notificationService.notifyAdmins(message);
        if (saved.getCreatedBy() != null) {
            notificationService.notifyUser(saved.getCreatedBy(), message);
        }

        sendPurchaseOrderCreatedEmails(saved);

        return saved;
    }

    public PurchaseOrder updateStatus(String id, String status) {
        String safeId = Objects.requireNonNull(id, "Order ID is required");
        PurchaseOrder order = orderRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + safeId));

        String previousStatus = order.getStatus();
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

        PurchaseOrder saved = orderRepository.save(order);

        activityLogService.logAction(
            "STATUS_CHANGE",
            "PURCHASE_ORDER",
            saved.getId(),
            "Purchase order " + saved.getOrderNumber() + " status changed from "
                + previousStatus + " to " + status
        );

        String msg = "Purchase order " + saved.getOrderNumber() + " status updated: " + previousStatus + " → " + status;
        notificationService.notifyAdmins(msg);
        if (saved.getCreatedBy() != null) {
            notificationService.notifyUser(saved.getCreatedBy(), msg);
        }
        sendPurchaseOrderStatusEmails(saved, previousStatus);

        return saved;
    }

    private void sendPurchaseOrderCreatedEmails(PurchaseOrder order) {
        String subject = "[VendorFlow] New purchase order: " + order.getOrderNumber();

        Vendor vendor = null;
        String vendorId = order.getVendorId();
        if (vendorId != null && !vendorId.isBlank()) {
            vendor = vendorRepository.findById(vendorId).orElse(null);
        }

        String body = buildPurchaseOrderEmailBody(order, vendor, "CREATED", null);

        if (vendor != null && vendor.getEmail() != null && !vendor.getEmail().isBlank()) {
            emailService.send(vendor.getEmail(), subject, body);
        }

        emailService.sendToAdmins(subject, body);
    }

    private void sendPurchaseOrderStatusEmails(PurchaseOrder order, String previousStatus) {
        String subject = "[VendorFlow] Purchase order status: " + order.getOrderNumber();

        Vendor vendor = null;
        String vendorId = order.getVendorId();
        if (vendorId != null && !vendorId.isBlank()) {
            vendor = vendorRepository.findById(vendorId).orElse(null);
        }

        String body = buildPurchaseOrderEmailBody(order, vendor, "STATUS_UPDATE", previousStatus);

        if (vendor != null && vendor.getEmail() != null && !vendor.getEmail().isBlank()) {
            emailService.send(vendor.getEmail(), subject, body);
        }

        if (order.getCreatedBy() != null && !order.getCreatedBy().isBlank()) {
            User creator = userRepository.findByUsername(order.getCreatedBy()).orElse(null);
            if (creator != null && creator.getEmail() != null && !creator.getEmail().isBlank()) {
                emailService.send(creator.getEmail(), subject, body);
            }
        }

        emailService.sendToAdmins(subject, body);
    }

    private String buildPurchaseOrderEmailBody(PurchaseOrder order, Vendor vendor, String event, String previousStatus) {
        StringBuilder sb = new StringBuilder();
        sb.append("Event: ").append(event).append("\n");
        sb.append("Order Number: ").append(order.getOrderNumber()).append("\n");
        sb.append("Status: ").append(order.getStatus()).append("\n");
        if (previousStatus != null) {
            sb.append("Previous Status: ").append(previousStatus).append("\n");
        }
        sb.append("Order Date: ").append(order.getOrderDate()).append("\n");
        sb.append("Expected Delivery: ").append(order.getExpectedDeliveryDate()).append("\n");
        sb.append("Created By: ").append(order.getCreatedBy()).append("\n");
        if (vendor != null) {
            sb.append("Vendor: ").append(vendor.getName()).append("\n");
        }
        if (order.getNotes() != null && !order.getNotes().isBlank()) {
            sb.append("Notes: ").append(order.getNotes()).append("\n");
        }
        sb.append("\nItems:\n");
        for (PurchaseOrder.OrderItem item : order.getItems()) {
            sb.append("- ")
              .append(item.getProductName())
              .append(" | Qty: ").append(item.getQuantity())
              .append(" | Unit: ").append(item.getUnitPrice())
              .append(" | Total: ").append(item.getTotalPrice())
              .append("\n");
        }
        sb.append("\nTotal Amount: ").append(order.getTotalAmount()).append("\n");
        return sb.toString();
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
