package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.training.dto.PerformedSetRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.exception.RoutineExerciseNotInSessionDayException;
import com.gestion_deportiva.api.training.exception.SetNumberOutOfRangeException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotFoundException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotInProgressException;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Series registradas en vivo (US-19, contrato 11.6). La regla de rol (solo ATHLETE) vive en SecurityConfig; qué atleta
// puede usar cada uno, en AthleteAccessGuard. Orden de evaluación: pertenencia (403) → sesión inexistente o de otro
// atleta (404) → bloqueo de la sesión (11.5) → sesión que no está en curso (409) → ejercicio ajeno al día (422) →
// serie fuera de 1..sets (422) → guardar (200). La validación del body (400) la hace el controller antes.
// Registrar una serie que ya existe la reemplaza: es lo que hace idempotente el reintento y la corrección
@Slf4j
@Service
@RequiredArgsConstructor
public class PerformedSetService {

    private final TrainingSessionRepository trainingSessionRepository;
    private final PerformedSetRepository performedSetRepository;
    private final AthleteAccessGuard athleteAccessGuard;

    @Transactional
    public TrainingSessionResponse record(AuthenticatedUser user, UUID athleteId, UUID sessionId,
                                          UUID routineExerciseId, int setNumber, PerformedSetRequest request) {
        athleteAccessGuard.verifyAccess(user, athleteId);

        // El bloqueo espera a una finalización concurrente y hace que dos registros seguidos se ejecuten en orden
        TrainingSession session = trainingSessionRepository.findByIdAndAthleteIdForUpdate(sessionId, athleteId)
                .orElseThrow(() -> new TrainingSessionNotFoundException(sessionId));
        if (!session.isInProgress()) {
            throw new TrainingSessionNotInProgressException();
        }

        RoutineExercise routineExercise = routineExerciseOfTheDay(session, routineExerciseId);
        if (setNumber < 1 || setNumber > routineExercise.getSets()) {
            throw new SetNumberOutOfRangeException(setNumber, routineExercise.getSets());
        }

        // Crea o reemplaza la serie completa: lo que el body no trae queda en null (contrato 11.2)
        PerformedSet performedSet = performedSetRepository
                .findByTrainingSessionIdAndRoutineExerciseIdAndSetNumber(sessionId, routineExerciseId, (short) setNumber)
                .orElseGet(() -> new PerformedSet(session, routineExercise, (short) setNumber));
        if (request.status() == SetStatus.DONE) {
            performedSet.markDone(request.weight(), request.reps(), request.rpe());
        } else {
            performedSet.markSkipped(request.skipReason());
        }

        // saveAndFlush: si la restricción única igual choca, la DataIntegrityViolationException sale de acá y el
        // GlobalExceptionHandler responde 409 genérico
        performedSetRepository.saveAndFlush(performedSet);
        log.info("El atleta {} registró la serie {} del ejercicio {} en la sesión {} ({})", athleteId, setNumber,
                routineExerciseId, sessionId, request.status());

        return TrainingSessionResponse.from(session, performedSetRepository.findBySessionInOrder(sessionId));
    }

    // Un ejercicio de otro día de la misma rutina, o uno inexistente, es el mismo error
    private static RoutineExercise routineExerciseOfTheDay(TrainingSession session, UUID routineExerciseId) {
        return session.getRoutineDay().getExercises().stream()
                .filter(exercise -> exercise.getId().equals(routineExerciseId))
                .findFirst()
                .orElseThrow(RoutineExerciseNotInSessionDayException::new);
    }
}
