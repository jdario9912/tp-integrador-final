package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.routine.dto.RoutineDayResponse;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// Sesión de entrenamiento (US-18, contrato 10.2): la misma representación para iniciar, la sesión en progreso y el
// detalle. Sin athleteId: los endpoints cuelgan de /athletes/{athleteId}
public record TrainingSessionResponse(
        UUID id,
        SessionStatus status,
        // Fecha de startedAt en la zona de la app
        LocalDate sessionDate,
        Instant startedAt,
        UUID assignmentId,
        UUID routineId,
        String routineName,
        // El día entrenado con sus ejercicios planificados: el mismo objeto de US-14/US-17
        RoutineDayResponse day
) {

    // La sesión tiene que traer cargados la asignación con su rutina y el día con sus ejercicios
    // (TrainingSessionRepository.findDetail o el día que ya leyó el service al iniciarla)
    public static TrainingSessionResponse from(TrainingSession session) {
        return new TrainingSessionResponse(
                session.getId(),
                session.getStatus(),
                session.getSessionDate(),
                session.getStartedAt(),
                session.getAssignment().getId(),
                session.getAssignment().getRoutine().getId(),
                session.getAssignment().getRoutine().getName(),
                RoutineDayResponse.from(session.getRoutineDay()));
    }
}
