package com.gestion_deportiva.api.alert.dto;

import com.gestion_deportiva.api.alert.model.Alert;
import com.gestion_deportiva.api.alert.model.enums.AlertSeverity;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.athlete.model.Athlete;

import java.time.Instant;
import java.util.UUID;

// message es el texto para mostrar (castellano). handledAt es null mientras está pendiente
public record AlertResponse(
        UUID id,
        UUID athleteId,
        String athleteName,
        AlertType type,
        AlertSeverity severity,
        String message,
        Instant generatedAt,
        Instant handledAt
) {

    // El atleta tiene que venir cargado (join fetch): se lee su nombre
    public static AlertResponse from(Alert alert) {
        Athlete athlete = alert.getAthlete();
        return new AlertResponse(alert.getId(), athlete.getId(), athlete.fullName(), alert.getType(),
                alert.getSeverity(), alert.getMessage(), alert.getGeneratedAt(), alert.getHandledAt());
    }
}
