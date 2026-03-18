package com.inventory.management.repository;

import com.inventory.management.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductRepository extends MongoRepository<Product, String> {
    Page<Product> findByActiveTrue(Pageable pageable);
    List<Product> findByCategoryId(String categoryId);
    List<Product> findByVendorId(String vendorId);
    List<Product> findByActiveTrueAndQuantityLessThanEqual(int threshold);
    Page<Product> findByNameContainingIgnoreCaseAndActiveTrue(String name, Pageable pageable);
    boolean existsBySku(String sku);
    long countByActiveTrue();
}
