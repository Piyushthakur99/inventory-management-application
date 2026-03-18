package com.inventory.management.service;

import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.repository.InventoryTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InventoryTransactionService {

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    public List<InventoryTransaction> getAll() {
        return transactionRepository.findAll();
    }

    public List<InventoryTransaction> getByProduct(String productId) {
        return transactionRepository.findByProductId(productId);
    }

    public Page<InventoryTransaction> getByProductPaged(String productId, int page, int size) {
        return transactionRepository.findByProductId(productId, PageRequest.of(page, size));
    }

    public List<InventoryTransaction> getByUser(String username) {
        return transactionRepository.findByPerformedBy(username);
    }
}
