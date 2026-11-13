package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.dto.AthleteRoutineResponse;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.repository.RoutineDayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Rutina activa del atleta (US-17). La regla de rol (COACH y ATHLETE) vive en SecurityConfig; qué atleta puede
// ver cada uno lo decide AthleteAccessGuard. Orden: atleta inexistente (404) → pertenencia (403) → sin rutina
// activa (vacío, el controller responde 204): solo quien puede ver al atleta se entera de si tiene rutina
@Service
@RequiredArgsConstructor
public class AthleteRoutineService {

    private final AthleteAccessGuard athleteAccessGuard;
    private final RoutineAssignmentRepository routineAssignmentRepository;
    private final RoutineDayRepository routineDayRepository;
    private final NextRoutineDayResolver nextRoutineDayResolver;
    private final Clock clock;
    private final TimeZoneProperties timeZoneProperties;

    // Vacío si el atleta no tiene una rutina activa. La vigencia y el día que toca se calculan en cada consulta con
    // la rutina tal como está: si el entrenador la edita, el atleta ve los cambios. Un atleta desvinculado sigue
    // viendo la suya (la desvinculación no toca la asignación); su ex-entrenador recibe 403 del guard
    @Transactional(readOnly = true)
    public Optional<AthleteRoutineResponse> findActive(AuthenticatedUser user, UUID athleteId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        return routineAssignmentRepository.findByAthleteIdAndActiveTrue(athleteId)
                .map(this::toResponse);
    }

    // Dos consultas en total: la asignación ya trajo la rutina (EntityGraph) y acá van los días con sus ejercicios
    // y el ejercicio del catálogo de cada uno
    private AthleteRoutineResponse toResponse(RoutineAssignment assignment) {
        List<RoutineDay> days = routineDayRepository.findWithExercisesByRoutineId(assignment.getRoutine().getId());
        UUID nextDayId = nextRoutineDayResolver.resolve(assignment, days);
        return AthleteRoutineResponse.from(assignment, days, today(), nextDayId);
    }

    // "Hoy" en la zona de la app y no en UTC: entre las 21:00 y las 23:59 de Argentina, en UTC ya es mañana
    private LocalDate today() {
        return LocalDate.now(clock.withZone(timeZoneProperties.zoneId()));
    }
}
