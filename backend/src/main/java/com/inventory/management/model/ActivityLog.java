package com.inventory.management.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "activity_logs")
public class ActivityLog {

    @Id
    private String id;

    private String action;
    private String username;
    private String entity;
    private String entityId;
    private String description;

    @Indexed
    private LocalDateTime timestamp;
}
