package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.routine.dto.RoutineDayResponse;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Sesión de entrenamiento (US-18, contrato 10.2): la misma representación para iniciar, la sesión en progreso y el
// detalle. Sin athleteId: los endpoints cuelgan de /athletes/{athleteId}
public record TrainingSessionResponse(
        UUID id,
        SessionStatus status,
        // Fecha de startedAt en la zona de la app
        LocalDate sessionDate,
        Instant startedAt,
        // US-20 (contrato 14.2): hora de fin, null mientras la sesión está en progreso
        Instant endedAt,
        UUID assignmentId,
        UUID routineId,
        String routineName,
        // El día entrenado con sus ejercicios planificados: el mismo objeto de US-14/US-17
        RoutineDayResponse day,
        // Series registradas en vivo (US-19, contrato 11.7): solo las registradas, sin las pendientes
        List<PerformedSetResponse> performedSets,
        // US-20 (contrato 14.2): resumen de lo prescrito y lo registrado. Siempre presente
        TrainingSessionSummary summary,
        // US-21 (contrato 15.5): revisión del entrenador; null si la sesión no está revisada
        TrainingSessionReviewResponse review
) {

    // La sesión tiene que traer cargados la asignación con su rutina y el día con sus ejercicios
    // (TrainingSessionRepository.findDetail o el día que ya leyó el service al iniciarla). Las series las lee el
    // service aparte (PerformedSetRepository.findBySessionInOrder); al iniciar, la lista va vacía
    public static TrainingSessionResponse from(TrainingSession session, List<PerformedSet> performedSets) {
        return new TrainingSessionResponse(
                session.getId(),
                session.getStatus(),
                session.getSessionDate(),
                session.getStartedAt(),
                session.getEndedAt(),
                session.getAssignment().getId(),
                session.getAssignment().getRoutine().getId(),
                session.getAssignment().getRoutine().getName(),
                RoutineDayResponse.from(session.getRoutineDay()),
                performedSets.stream().map(PerformedSetResponse::from).toList(),
                TrainingSessionSummary.from(session, performedSets),
                TrainingSessionReviewResponse.of(session));
    }
}
