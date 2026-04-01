package com.inventory.management.service;

import com.inventory.management.exception.ResourceNotFoundException;
import com.inventory.management.model.Notification;
import com.inventory.management.model.User;
import com.inventory.management.repository.NotificationRepository;
import com.inventory.management.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public Notification notifyUser(String username, String message) {
        String safeUsername = Objects.requireNonNull(username, "Username is required");

        Notification n = new Notification();
        n.setUsername(safeUsername);
        n.setMessage(message);
        n.setRead(false);
        n.setTimestamp(LocalDateTime.now());
        return notificationRepository.save(n);
    }

    public void notifyAdmins(String message) {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            if (user == null || user.getUsername() == null) {
                continue;
            }
            if (user.getRoles() != null && user.getRoles().contains("ROLE_ADMIN")) {
                notifyUser(user.getUsername(), message);
            }
        }
    }

    public List<Notification> getMyNotifications(int limit) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        if (username == null || username.isBlank()) {
            return List.of();
        }
        List<Notification> all = notificationRepository.findByUsernameOrderByTimestampDesc(username);
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        return all.stream().limit(safeLimit).toList();
    }

    public Notification markAsRead(String id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;

        String safeId = Objects.requireNonNull(id, "Notification id is required");
        Notification n = notificationRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + safeId));

        if (username == null || !username.equals(n.getUsername())) {
            throw new AccessDeniedException("Not allowed");
        }

        if (!n.isRead()) {
            n.setRead(true);
            notificationRepository.save(n);
        }

        return n;
    }
}
