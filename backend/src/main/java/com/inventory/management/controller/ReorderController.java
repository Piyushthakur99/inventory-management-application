package com.inventory.management.controller;

import com.inventory.management.dto.ReorderSuggestionDTO;
import com.inventory.management.model.PurchaseOrder;
import com.inventory.management.service.ReorderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reorder")
@CrossOrigin(origins = "*")
public class ReorderController {

    @Autowired
    private ReorderService reorderService;

    @GetMapping("/suggestions")
    public ResponseEntity<List<ReorderSuggestionDTO>> getSuggestions() {
        return ResponseEntity.ok(reorderService.getReorderSuggestions());
    }

    @PostMapping("/create/{productId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PurchaseOrder> createOrder(@PathVariable String productId) {
        return ResponseEntity.ok(reorderService.createOrderFromSuggestion(productId));
    }
}
