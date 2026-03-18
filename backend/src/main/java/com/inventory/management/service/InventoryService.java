package com.inventory.management.service;

import com.inventory.management.model.InventoryTransaction;
import com.inventory.management.repository.InventoryTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InventoryService {

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    public Page<InventoryTransaction> getAllTransactions(int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by("transactionDate").descending());
        return transactionRepository.findAll(pageable);
    }

    public List<InventoryTransaction> getTransactionsByProduct(String productId) {
        return transactionRepository.findByProductId(productId);
    }
}
