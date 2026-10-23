package com.gestion_deportiva.api.auth.dto;

import com.gestion_deportiva.api.user.model.enums.Role;

// Respuesta de login y refresh. expiresIn y refreshExpiresIn están en segundos.
public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String refreshToken,
        long refreshExpiresIn,
        Role role,
        AuthUserResponse user
) {

    public static final String TOKEN_TYPE = "Bearer";

    public static AuthResponse of(String accessToken, long expiresIn, String refreshToken, long refreshExpiresIn,
                                  AuthUserResponse user) {
        return new AuthResponse(accessToken, TOKEN_TYPE, expiresIn, refreshToken, refreshExpiresIn, user.role(),
                user);
    }
}
