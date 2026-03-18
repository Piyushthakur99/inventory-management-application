package com.inventory.management.controller;

import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @GetMapping("/transactions")
    public ResponseEntity<Page<InventoryTransaction>> getAllTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(inventoryService.getAllTransactions(page, size));
    }

    @GetMapping("/transactions/product/{productId}")
    public ResponseEntity<List<InventoryTransaction>> getByProduct(
            @PathVariable String productId) {
        return ResponseEntity.ok(inventoryService.getTransactionsByProduct(productId));
    }
}
