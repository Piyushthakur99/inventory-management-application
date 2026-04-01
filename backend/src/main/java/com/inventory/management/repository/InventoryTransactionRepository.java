package com.inventory.management.repository;

import com.inventory.management.model.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Aggregation;

import java.time.LocalDateTime;
import java.util.List;

public interface InventoryTransactionRepository extends MongoRepository<InventoryTransaction, String> {
    List<InventoryTransaction> findByProductId(String productId);
    Page<InventoryTransaction> findByProductId(String productId, Pageable pageable);
    List<InventoryTransaction> findByPerformedBy(String username);
    List<InventoryTransaction> findByTransactionDateGreaterThanEqual(LocalDateTime since);

    List<InventoryTransaction> findByTransactionDateBetween(LocalDateTime from, LocalDateTime to);

    @Aggregation(pipeline = {
            "{ '$match': { 'transactionDate': { '$gte': ?0 }, 'transactionType': 'OUT' } }",
            "{ '$group': { '_id': '$productId', 'totalQuantity': { '$sum': '$quantity' } } }",
            "{ '$project': { '_id': 0, 'productId': '$_id', 'totalQuantity': 1 } }"
    })
    List<ProductUsageProjection> summarizeConsumptionByProductSince(LocalDateTime since);
}
