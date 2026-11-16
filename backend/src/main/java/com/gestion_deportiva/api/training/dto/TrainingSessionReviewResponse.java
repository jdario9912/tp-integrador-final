package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.training.model.TrainingSession;

import java.time.Instant;

// US-21 · Revisión del entrenador (contrato 15.5): cuándo la revisó y su observación. Va en la sesión (campo review)
// y en el ítem del historial. Sin revisión, el campo es null y no un objeto vacío
public record TrainingSessionReviewResponse(
        // Último momento de revisión (AppClock, a microsegundos)
        Instant reviewedAt,
        // Observación recortada; null si el entrenador no escribió texto
        String observation
) {

    // null si la sesión no está revisada
    public static TrainingSessionReviewResponse of(TrainingSession session) {
        if (!session.isReviewed()) {
            return null;
        }
        return new TrainingSessionReviewResponse(session.getReviewedAt(), session.getCoachObservation());
    }
}
