package com.gestion_deportiva.api.user.dto;

import com.gestion_deportiva.api.storage.SignedUrl;
import com.gestion_deportiva.api.user.model.User;

import java.time.Instant;
import java.util.UUID;

// US-48 · Perfil propio para la API (contrato 18.2). Nunca lleva la ruta del objeto ni el hash de la contraseña: la foto
// sale como URL firmada, que vence en photoUrlExpiresAt. Sin foto (o sin firma por Storage caído), photoUrl y su
// vencimiento van en null
public record UserProfileResponse(
        UUID id,
        String role,
        String firstName,
        String lastName,
        String email,
        String phone,
        String photoUrl,
        Instant photoUrlExpiresAt
) {

    public static UserProfileResponse of(User user, SignedUrl signedUrl) {
        return new UserProfileResponse(
                user.getId(),
                user.getRole().name(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                signedUrl == null ? null : signedUrl.url(),
                signedUrl == null ? null : signedUrl.expiresAt());
    }
}
