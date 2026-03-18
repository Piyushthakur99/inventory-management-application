package com.inventory.management.service;

import com.inventory.management.repository.ProductRepository;
import com.inventory.management.repository.PurchaseOrderRepository;
import com.inventory.management.repository.VendorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class DashboardService {

    @Autowired private ProductRepository productRepository;
    @Autowired private VendorRepository vendorRepository;
    @Autowired private PurchaseOrderRepository orderRepository;
    @Autowired private ProductService productService;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProducts",   productRepository.countByActiveTrue());
        stats.put("totalVendors",    vendorRepository.countByActiveTrue());
        stats.put("totalOrders",     orderRepository.count());
        stats.put("pendingOrders",   orderRepository.countByStatus("PENDING"));
        stats.put("receivedOrders",  orderRepository.countByStatus("RECEIVED"));
        stats.put("cancelledOrders", orderRepository.countByStatus("CANCELLED"));

        var lowStock = productService.getLowStockProducts();
        stats.put("lowStockCount", lowStock.size());
        stats.put("lowStockItems", lowStock);

        return stats;
    }
}
