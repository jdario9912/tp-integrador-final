package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.dto.AssignRoutineRequest;
import com.gestion_deportiva.api.assignment.dto.RoutineAssignmentResponse;
import com.gestion_deportiva.api.assignment.exception.ActiveAssignmentExistsException;
import com.gestion_deportiva.api.assignment.exception.AthleteNotAssignableException;
import com.gestion_deportiva.api.assignment.exception.IncompleteRoutineException;
import com.gestion_deportiva.api.assignment.exception.RoutineAlreadyActiveException;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.service.RoutineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

// Asignación de rutinas a atletas (US-16). La regla de rol (solo COACH) vive en SecurityConfig. Orden de
// evaluación del alta: atleta inexistente (404) → desvinculado (422) → de otro entrenador (403) → desactivado (422)
// → rutina inexistente (404) → de otro entrenador (403) → incompleta (422) → ya es la activa (422) → hay otra
// activa sin confirmar el reemplazo (409)
@Slf4j
@Service
@RequiredArgsConstructor
public class RoutineAssignmentService {

    private final RoutineAssignmentRepository routineAssignmentRepository;
    private final AthleteRepository athleteRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final RoutineService routineService;
    private final Clock clock;
    private final TimeZoneProperties timeZoneProperties;

    @Transactional
    public RoutineAssignmentResponse assign(UUID coachId, UUID athleteId, AssignRoutineRequest request) {
        Athlete athlete = findAssignableAthlete(coachId, athleteId);

        Routine routine = routineService.findOwned(coachId, request.routineId());
        if (!routine.isComplete()) {
            throw new IncompleteRoutineException();
        }

        Optional<RoutineAssignment> current = routineAssignmentRepository.findByAthleteIdAndActiveTrue(athleteId);
        if (current.isPresent()) {
            RoutineAssignment active = current.get();
            if (active.getRoutine().equals(routine)) {
                throw new RoutineAlreadyActiveException();
            }
            if (!request.replaceActiveOrFalse()) {
                throw new ActiveAssignmentExistsException(active.getRoutine().getName());
            }
            active.deactivate();
            // Flush antes del INSERT: Hibernate ejecuta los INSERT antes que los UPDATE, y la nueva activa
            // chocaría contra ux_routine_assignments_athlete_active con la anterior todavía activa
            routineAssignmentRepository.flush();
        }

        RoutineAssignment assignment = RoutineAssignment.builder()
                .athlete(athlete)
                .routine(routine)
                .assignmentDate(today())
                .build();

        // saveAndFlush ejecuta el INSERT acá: si dos asignaciones simultáneas chocan contra el índice de la activa,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler (409)
        return RoutineAssignmentResponse.from(routineAssignmentRepository.saveAndFlush(assignment));
    }

    // Historial del atleta: primero la activa y después de la más reciente a la más antigua
    @Transactional(readOnly = true)
    public PageResponse<RoutineAssignmentResponse> findByAthlete(AuthenticatedUser user, UUID athleteId,
                                                                 Pageable pageable) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        return PageResponse.from(routineAssignmentRepository.findHistory(athleteId, pageable)
                .map(RoutineAssignmentResponse::from));
    }

    // No usa AthleteAccessGuard: un atleta desvinculado es un 422 (regla de negocio) y no un 403
    private Athlete findAssignableAthlete(UUID coachId, UUID athleteId) {
        Athlete athlete = athleteRepository.findById(athleteId)
                .orElseThrow(() -> new AthleteNotFoundException(athleteId));
        if (athlete.getCoach() == null) {
            throw AthleteNotAssignableException.unlinked();
        }
        // Solo lee el id del entrenador: con el proxy LAZY no dispara una consulta
        if (!coachId.equals(athlete.getCoach().getId())) {
            log.warn("Acceso denegado: el entrenador {} intentó asignar una rutina al atleta {}", coachId, athleteId);
            throw new AthleteAccessDeniedException();
        }
        if (!athlete.isActive()) {
            throw AthleteNotAssignableException.inactive();
        }
        return athlete;
    }

    // "Hoy" en la zona de la app y no en UTC: entre las 21:00 y las 23:59 de Argentina, en UTC ya es mañana
    private LocalDate today() {
        return LocalDate.now(clock.withZone(timeZoneProperties.zoneId()));
    }
}
