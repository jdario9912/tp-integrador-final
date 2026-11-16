package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// US-21 · Ítem del historial de sesiones cerradas (contrato 15.3). Liviano: sin el día con sus ejercicios ni las series;
// el detalle sale de GET .../sessions/{sessionId}
public record TrainingSessionHistoryItem(
        UUID id,
        LocalDate sessionDate,
        // FINISHED o CANCELLED: el historial no trae sesiones en progreso
        SessionStatus status,
        Instant startedAt,
        // Con FINISHED o CANCELLED siempre tiene valor (V14)
        Instant endedAt,
        String routineName,
        short dayNumber,
        String dayName,
        // Cumplimiento de la sesión (contrato 14.4), calculado en una consulta para toda la página
        TrainingSessionSummary summary,
        // null si el entrenador no revisó la sesión
        TrainingSessionReviewResponse review
) {

    // La sesión tiene que traer su asignación con la rutina y su día (la carga la consulta del historial). El resumen
    // lo calcula el service para toda la página
    public static TrainingSessionHistoryItem from(TrainingSession session, TrainingSessionSummary summary) {
        RoutineDay day = session.getRoutineDay();
        return new TrainingSessionHistoryItem(
                session.getId(),
                session.getSessionDate(),
                session.getStatus(),
                session.getStartedAt(),
                session.getEndedAt(),
                session.getAssignment().getRoutine().getName(),
                day.getDayNumber(),
                day.getName(),
                summary,
                TrainingSessionReviewResponse.of(session));
    }
}
