package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.repository.RoutineDayRepository;
import com.gestion_deportiva.api.training.dto.StartTrainingSessionRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.exception.EmptyRoutineDayException;
import com.gestion_deportiva.api.training.exception.ExpiredRoutineException;
import com.gestion_deportiva.api.training.exception.NoActiveRoutineException;
import com.gestion_deportiva.api.training.exception.RoutineDayNotInActiveRoutineException;
import com.gestion_deportiva.api.training.exception.TrainingSessionInProgressException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotFoundException;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

// Sesiones de entrenamiento (US-18, contrato 10). La regla de rol vive en SecurityConfig (solo ATHLETE inicia; los
// dos roles leen); qué atleta puede usar cada uno lo decide AthleteAccessGuard, antes de cualquier otra consulta.
// Orden al iniciar: atleta inexistente (404) → pertenencia (403) → ya hay una en progreso (409) → sin rutina activa
// (422) → vencida (422) → día ajeno a la rutina activa (422) → día sin ejercicios (422). El 409 va antes que los 422:
// si hay una sesión abierta, lo útil es retomarla aunque la rutina haya vencido o cambiado desde que se inició
@Slf4j
@Service
@RequiredArgsConstructor
public class TrainingSessionService {

    private final TrainingSessionRepository trainingSessionRepository;
    private final RoutineAssignmentRepository routineAssignmentRepository;
    private final RoutineDayRepository routineDayRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final AppClock appClock;

    @Transactional
    public TrainingSessionResponse start(AuthenticatedUser user, UUID athleteId, StartTrainingSessionRequest request) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        if (trainingSessionRepository.existsByAthleteIdAndStatus(athleteId, SessionStatus.IN_PROGRESS)) {
            throw new TrainingSessionInProgressException();
        }

        // Trae la rutina (EntityGraph). Un atleta desvinculado conserva su asignación activa: también puede entrenar
        RoutineAssignment assignment = routineAssignmentRepository.findByAthleteIdAndActiveTrue(athleteId)
                .orElseThrow(NoActiveRoutineException::new);

        // El instante y su fecha salen del mismo now(): nunca quedan en días distintos (a medianoche)
        Instant startedAt = appClock.now();
        LocalDate sessionDate = appClock.dateOf(startedAt);
        if (assignment.isExpiredOn(sessionDate)) {
            throw new ExpiredRoutineException(assignment.endDate());
        }

        // Una consulta con los días y sus ejercicios (a lo sumo 7 × 30): el día se busca en memoria y la respuesta
        // usa los ejercicios ya cargados
        RoutineDay day = routineDayRepository.findWithExercisesByRoutineId(assignment.getRoutine().getId()).stream()
                .filter(candidate -> candidate.getId().equals(request.routineDayId()))
                .findFirst()
                .orElseThrow(RoutineDayNotInActiveRoutineException::new);
        if (day.getExercises().isEmpty()) {
            throw new EmptyRoutineDayException();
        }

        // saveAndFlush ejecuta el INSERT acá: si dos inicios simultáneos chocan contra el índice de la sesión en
        // progreso (o el entrenador quitó el día en paralelo), la DataIntegrityViolationException sale de este método
        // y la resuelve el GlobalExceptionHandler (409 genérico)
        TrainingSession session = trainingSessionRepository.saveAndFlush(
                TrainingSession.start(assignment, day, startedAt, sessionDate));
        log.info("El atleta {} inició la sesión de entrenamiento {} (día {})", athleteId, session.getId(), day.getId());
        return TrainingSessionResponse.from(session);
    }

    // Vacío si el atleta no tiene una sesión en progreso (el controller responde 204)
    @Transactional(readOnly = true)
    public Optional<TrainingSessionResponse> findInProgress(AuthenticatedUser user, UUID athleteId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        return trainingSessionRepository.findDetailByAthleteIdAndStatus(athleteId, SessionStatus.IN_PROGRESS)
                .map(TrainingSessionResponse::from);
    }

    // 404 si la sesión no existe o es de otro atleta; va después de la pertenencia: solo quien puede ver al atleta
    // se entera de si un id de sesión existe
    @Transactional(readOnly = true)
    public TrainingSessionResponse findById(AuthenticatedUser user, UUID athleteId, UUID sessionId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        return trainingSessionRepository.findDetail(athleteId, sessionId)
                .map(TrainingSessionResponse::from)
                .orElseThrow(() -> new TrainingSessionNotFoundException(sessionId));
    }
}
