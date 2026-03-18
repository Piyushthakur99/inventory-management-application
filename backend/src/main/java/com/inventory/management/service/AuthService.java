package com.inventory.management.service;

import com.inventory.management.dto.AuthRequest;
import com.inventory.management.dto.AuthResponse;
import com.inventory.management.dto.RegisterRequest;
import com.inventory.management.model.User;
import com.inventory.management.repository.UserRepository;
import com.inventory.management.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;

@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserDetailsService userDetailsService;

    public String register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());

        Set<String> roles = (request.getRoles() != null && !request.getRoles().isEmpty())
                ? request.getRoles()
                : Set.of("ROLE_STAFF");
        user.setRoles(roles);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());

        userRepository.save(user);
        return "User registered successfully";
    }

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(), request.getPassword())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        String token = jwtUtil.generateToken(userDetails);

        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
        return new AuthResponse(
                token,
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRoles()
        );
    }
}
