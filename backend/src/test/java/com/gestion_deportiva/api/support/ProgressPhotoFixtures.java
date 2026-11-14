package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;

import java.time.Instant;
import java.time.LocalDate;

// Datos de prueba reutilizables para las fotos de progreso (US-28)
public final class ProgressPhotoFixtures {

    // Momento de la subida de las fotos armadas con progressPhoto(...)
    public static final Instant CREATED_AT = Instant.parse("2026-11-13T20:14:31.123456Z");

    // Fecha pasada fija: nunca es futura, corra cuando corra el test
    public static final LocalDate TAKEN_ON = LocalDate.of(2026, 11, 12);

    private ProgressPhotoFixtures() {
    }

    public static ProgressPhoto progressPhoto(Athlete athlete, ProgressPhotoType type, LocalDate takenOn,
                                              String storagePath) {
        return new ProgressPhoto(athlete, type, takenOn, storagePath, CREATED_AT);
    }

    public static ProgressPhoto progressPhoto(Athlete athlete, ProgressPhotoType type, LocalDate takenOn,
                                              String storagePath, Instant createdAt) {
        return new ProgressPhoto(athlete, type, takenOn, storagePath, createdAt);
    }
}
