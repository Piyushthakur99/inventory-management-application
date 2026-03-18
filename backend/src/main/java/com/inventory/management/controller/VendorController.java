package com.inventory.management.controller;

import com.inventory.management.dto.VendorDTO;
import com.inventory.management.model.Vendor;
import com.inventory.management.service.VendorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vendors")
@CrossOrigin(origins = "*")
public class VendorController {

    @Autowired
    private VendorService vendorService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Vendor> createVendor(@Valid @RequestBody VendorDTO dto) {
        return ResponseEntity.ok(vendorService.createVendor(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Vendor> updateVendor(@PathVariable String id,
                                                @Valid @RequestBody VendorDTO dto) {
        return ResponseEntity.ok(vendorService.updateVendor(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteVendor(@PathVariable String id) {
        vendorService.deleteVendor(id);
        return ResponseEntity.ok("Vendor deleted successfully");
    }

    @GetMapping
    public ResponseEntity<List<Vendor>> getAllVendors() {
        return ResponseEntity.ok(vendorService.getAllActiveVendors());
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Vendor>> searchVendors(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(vendorService.searchVendors(name, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Vendor> getVendor(@PathVariable String id) {
        return ResponseEntity.ok(vendorService.getVendorById(id));
    }
}
