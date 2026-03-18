package com.inventory.management.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "vendors")
public class Vendor {

    @Id
    private String id;

    private String name;
    private String contactPerson;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;

    private boolean active = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
