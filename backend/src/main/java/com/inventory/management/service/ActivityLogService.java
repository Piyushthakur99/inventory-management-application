package com.inventory.management.service;

import com.inventory.management.model.ActivityLog;
import com.inventory.management.repository.ActivityLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ActivityLogService {

    private static final Logger logger = LoggerFactory.getLogger(ActivityLogService.class);

    @Autowired
    private ActivityLogRepository activityLogRepository;

    public void logAction(String action, String entity, String entityId, String description) {
        try {
            ActivityLog log = new ActivityLog();
            log.setAction(action);
            log.setEntity(entity);
            log.setEntityId(entityId);
            log.setDescription(description);
            log.setUsername(resolveUsername());
            log.setTimestamp(LocalDateTime.now());
            activityLogRepository.save(log);
        } catch (Exception ex) {
            // Avoid impacting core business operations if audit logging fails.
            logger.warn("Failed to persist activity log: {}", ex.getMessage());
        }
    }

    public List<ActivityLog> getLatestLogs() {
        return activityLogRepository.findTop10ByOrderByTimestampDesc();
    }

    private String resolveUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "system";
        }
        return auth.getName();
    }
}
