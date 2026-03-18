package com.inventory.management.service;

import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.Category;
import com.inventory.management.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    public Category createCategory(Category category) {
        category.setActive(true);
        return categoryRepository.save(category);
    }

    public Category updateCategory(String id, Category updated) {
        String safeId = Objects.requireNonNull(id, "Category ID is required");
        Category category = categoryRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + safeId));
        category.setName(updated.getName());
        category.setDescription(updated.getDescription());
        return categoryRepository.save(category);
    }

    public void deleteCategory(String id) {
        String safeId = Objects.requireNonNull(id, "Category ID is required");
        Category category = categoryRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + safeId));
        category.setActive(false);
        categoryRepository.save(category);
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findByActiveTrue();
    }

    public Category getCategoryById(String id) {
        String safeId = Objects.requireNonNull(id, "Category ID is required");
        return categoryRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + safeId));
    }
}
