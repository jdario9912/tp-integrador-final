package com.gestion_deportiva.api.auth.controller;

import com.gestion_deportiva.api.auth.dto.AuthResponse;
import com.gestion_deportiva.api.auth.dto.AuthUserResponse;
import com.gestion_deportiva.api.auth.dto.LoginRequest;
import com.gestion_deportiva.api.auth.dto.RefreshRequest;
import com.gestion_deportiva.api.auth.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // @SecurityRequirements vacío: en Swagger figura como endpoint público (sin candado)
    @PostMapping("/login")
    @SecurityRequirements
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    @SecurityRequirements
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    // Revoca el refresh token de la sesión del usuario autenticado. Sin @SecurityRequirements:
    // en Swagger figura con candado y en runtime exige el access token.
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Jwt jwt) {
        authService.logout(UUID.fromString(jwt.getSubject()));
    }

    // El subject del JWT es el id del usuario (lo firma JwtService)
    @GetMapping("/me")
    public AuthUserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
