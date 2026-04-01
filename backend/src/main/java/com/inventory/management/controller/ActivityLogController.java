package com.inventory.management.controller;

import com.inventory.management.model.ActivityLog;
import com.inventory.management.service.ActivityLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/activity")
@CrossOrigin(origins = "*")
public class ActivityLogController {

    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping("/logs")
    public ResponseEntity<List<ActivityLog>> getLatestLogs() {
        return ResponseEntity.ok(activityLogService.getLatestLogs());
    }
}
