package com.gestion_deportiva.api.auth.dto;

import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.model.enums.Role;

import java.util.UUID;

// Datos del usuario autenticado. Sin datos sensibles: nunca exponer passwordHash
public record AuthUserResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        Role role
) {

    public static AuthUserResponse from(User user) {
        return new AuthUserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(),
                user.getRole());
    }
}
