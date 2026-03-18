package com.inventory.management.repository;

import com.inventory.management.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CategoryRepository extends MongoRepository<Category, String> {
    List<Category> findByActiveTrue();
}
