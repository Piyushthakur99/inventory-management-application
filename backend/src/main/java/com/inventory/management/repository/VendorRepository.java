package com.inventory.management.repository;

import com.inventory.management.model.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VendorRepository extends MongoRepository<Vendor, String> {
    List<Vendor> findByActiveTrue();
    Page<Vendor> findByNameContainingIgnoreCaseAndActiveTrue(String name, Pageable pageable);
    long countByActiveTrue();
}
