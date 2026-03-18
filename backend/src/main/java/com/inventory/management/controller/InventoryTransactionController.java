package com.inventory.management.controller;

import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.service.InventoryTransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class InventoryTransactionController {

    @Autowired
    private InventoryTransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<InventoryTransaction>> getAll() {
        return ResponseEntity.ok(transactionService.getAll());
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<Page<InventoryTransaction>> getByProduct(
            @PathVariable String productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(transactionService.getByProductPaged(productId, page, size));
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<List<InventoryTransaction>> getByUser(@PathVariable String username) {
        return ResponseEntity.ok(transactionService.getByUser(username));
    }
}
