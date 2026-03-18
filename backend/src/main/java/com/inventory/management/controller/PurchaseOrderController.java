package com.inventory.management.controller;

import com.inventory.management.dto.PurchaseOrderDTO;
import com.inventory.management.model.PurchaseOrder;
import com.inventory.management.service.PurchaseOrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class PurchaseOrderController {

    @Autowired
    private PurchaseOrderService orderService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PurchaseOrder> createOrder(@Valid @RequestBody PurchaseOrderDTO dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PurchaseOrder> updateStatus(@PathVariable String id,
                                                       @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(orderService.updateStatus(id, body.get("status")));
    }

    @GetMapping
    public ResponseEntity<List<PurchaseOrder>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrder> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<PurchaseOrder>> getOrdersByStatus(@PathVariable String status) {
        return ResponseEntity.ok(orderService.getOrdersByStatus(status));
    }
}
