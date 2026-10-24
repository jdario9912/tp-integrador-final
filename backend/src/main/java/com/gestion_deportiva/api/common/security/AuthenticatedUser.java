package com.gestion_deportiva.api.common.security;

import com.gestion_deportiva.api.auth.service.JwtService;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Objects;
import java.util.UUID;

// Quién hace la request (US-04): id y rol, tomados del access token. Los services reciben esto y no el Jwt,
// así no dependen del mecanismo de autenticación
public record AuthenticatedUser(UUID id, Role role) {

    public AuthenticatedUser {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(role, "role");
    }

    // El JwtDecoder ya validó firma, emisor y vencimiento; el subject (id) y el claim "role" los firma JwtService
    public static AuthenticatedUser from(Jwt jwt) {
        return new AuthenticatedUser(UUID.fromString(jwt.getSubject()),
                Role.valueOf(jwt.getClaimAsString(JwtService.ROLE_CLAIM)));
    }
}
