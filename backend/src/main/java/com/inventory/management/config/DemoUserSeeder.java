package com.inventory.management.config;

import com.inventory.management.model.User;
import com.inventory.management.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Set;

@Component
public class DemoUserSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo.seed-users:true}")
    private boolean seedUsers;

    public DemoUserSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!seedUsers) {
            log.info("Demo user seeding disabled (app.demo.seed-users=false)");
            return;
        }

        seedIfMissing(
                "admin",
                "admin@example.com",
                "Admin User",
                "admin123",
                Set.of("ROLE_ADMIN")
        );

        seedIfMissing(
                "staff",
                "staff@example.com",
                "Staff User",
                "staff123",
                Set.of("ROLE_STAFF")
        );
    }

    private void seedIfMissing(String username, String email, String fullName, String rawPassword, Set<String> roles) {
        boolean exists = userRepository.existsByUsername(username) || userRepository.existsByEmail(email);
        if (exists) {
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRoles(roles);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);
        log.info("Seeded demo user '{}' with roles {}", username, roles);
    }
}
