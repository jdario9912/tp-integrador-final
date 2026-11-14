package com.gestion_deportiva.api.photo.dto;

import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import com.gestion_deportiva.api.storage.SignedUrl;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// Foto de progreso para la API (contrato de US-28, sección 2). Nunca lleva la ruta del objeto: la URL firmada es lo
// único que deja ver el archivo, y vence en urlExpiresAt. Sin athleteId: sale de la ruta
public record ProgressPhotoResponse(
        UUID id,
        String type,
        LocalDate takenOn,
        String url,
        Instant urlExpiresAt,
        Instant createdAt
) {

    public static ProgressPhotoResponse from(ProgressPhoto photo, SignedUrl signedUrl) {
        return new ProgressPhotoResponse(
                photo.getId(),
                photo.getType().name(),
                photo.getTakenOn(),
                signedUrl.url(),
                signedUrl.expiresAt(),
                photo.getCreatedAt());
    }
}
