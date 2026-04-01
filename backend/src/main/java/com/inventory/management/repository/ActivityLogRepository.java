package com.inventory.management.repository;

import com.inventory.management.model.ActivityLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ActivityLogRepository extends MongoRepository<ActivityLog, String> {
    List<ActivityLog> findTop10ByOrderByTimestampDesc();
}
