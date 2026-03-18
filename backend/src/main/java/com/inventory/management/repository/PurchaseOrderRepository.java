package com.inventory.management.repository;

import com.inventory.management.model.PurchaseOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends MongoRepository<PurchaseOrder, String> {
    List<PurchaseOrder> findByVendorId(String vendorId);
    List<PurchaseOrder> findByStatus(String status);
    Optional<PurchaseOrder> findByOrderNumber(String orderNumber);
    long countByStatus(String status);
}
