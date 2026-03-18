package com.inventory.management.service;

import com.inventory.management.dto.VendorDTO;
import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.Vendor;
import com.inventory.management.repository.VendorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class VendorService {

    @Autowired
    private VendorRepository vendorRepository;

    public Vendor createVendor(VendorDTO dto) {
        Vendor vendor = new Vendor();
        mapDtoToVendor(dto, vendor);
        vendor.setActive(true);
        vendor.setCreatedAt(LocalDateTime.now());
        return vendorRepository.save(vendor);
    }

    public Vendor updateVendor(String id, VendorDTO dto) {
        String safeId = Objects.requireNonNull(id, "Vendor ID is required");
        Vendor vendor = vendorRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + safeId));
        mapDtoToVendor(dto, vendor);
        vendor.setUpdatedAt(LocalDateTime.now());
        return vendorRepository.save(vendor);
    }

    public void deleteVendor(String id) {
        String safeId = Objects.requireNonNull(id, "Vendor ID is required");
        Vendor vendor = vendorRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + safeId));
        vendor.setActive(false);
        vendorRepository.save(vendor);
    }

    public List<Vendor> getAllActiveVendors() {
        return vendorRepository.findByActiveTrue();
    }

    public Page<Vendor> searchVendors(String name, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (name != null && !name.isBlank()) {
            return vendorRepository.findByNameContainingIgnoreCaseAndActiveTrue(name, pageable);
        }
        return vendorRepository.findAll(pageable);
    }

    public Vendor getVendorById(String id) {
        String safeId = Objects.requireNonNull(id, "Vendor ID is required");
        return vendorRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + safeId));
    }

    private void mapDtoToVendor(VendorDTO dto, Vendor vendor) {
        vendor.setName(dto.getName());
        vendor.setContactPerson(dto.getContactPerson());
        vendor.setEmail(dto.getEmail());
        vendor.setPhone(dto.getPhone());
        vendor.setAddress(dto.getAddress());
        vendor.setCity(dto.getCity());
        vendor.setCountry(dto.getCountry());
    }
}
