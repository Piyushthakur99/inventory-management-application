package com.inventory.management.repository;

import com.inventory.management.model.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface InventoryTransactionRepository extends MongoRepository<InventoryTransaction, String> {
    List<InventoryTransaction> findByProductId(String productId);
    Page<InventoryTransaction> findByProductId(String productId, Pageable pageable);
    List<InventoryTransaction> findByPerformedBy(String username);
}
