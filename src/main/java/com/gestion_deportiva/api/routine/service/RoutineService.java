package com.gestion_deportiva.api.routine.service;

import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.dto.RoutineResponse;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.exception.RoutineNameAlreadyExistsException;
import com.gestion_deportiva.api.routine.exception.RoutineNotFoundException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Rutinas del entrenador (US-13). Recibe el id del entrenador y no el principal, igual que ExerciseService
@Service
@RequiredArgsConstructor
public class RoutineService {

    private static final Logger log = LoggerFactory.getLogger(RoutineService.class);

    // Orden fijo del listado: el "sort" del cliente se ignora (ver ExerciseService.CATALOG_SORT).
    // El id desempata para que la paginación sea estable
    static final Sort MY_ROUTINES_SORT = Sort.by("name", "id");

    private final RoutineRepository routineRepository;
    private final CoachRepository coachRepository;

    @Transactional
    public RoutineResponse create(UUID coachId, RoutineRequest request) {
        // Con un coach autenticado siempre existe; cubre el caso de que se haya borrado después de autenticarse
        Coach coach = coachRepository.findById(coachId)
                .orElseThrow(() -> new CoachNotFoundException(coachId));

        String name = request.name().trim();
        if (routineRepository.existsByCoachIdAndNameIgnoreCase(coachId, name)) {
            throw new RoutineNameAlreadyExistsException(name);
        }

        Routine routine = Routine.builder()
                .name(name)
                .coach(coach)
                .description(blankToNull(request.description()))
                .goal(blankToNull(request.goal()))
                .daysPerWeek(request.daysPerWeek())
                .durationWeeks(request.durationWeeks())
                .template(Boolean.TRUE.equals(request.isTemplate()))
                .build();

        // saveAndFlush ejecuta el INSERT acá: si dos altas simultáneas chocan contra ux_routines_coach_name,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler (409)
        return RoutineResponse.from(routineRepository.saveAndFlush(routine));
    }

    // "Mis rutinas": solo las del entrenador autenticado
    @Transactional(readOnly = true)
    public PageResponse<RoutineResponse> findMine(UUID coachId, Pageable pageable) {
        Pageable page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), MY_ROUTINES_SORT);
        return PageResponse.from(routineRepository.findByCoachId(coachId, page).map(RoutineResponse::from));
    }

    // 404 si no existe; 403 si es de otro entrenador. Los ids son UUID: distinguir los dos casos
    // no permite enumerar rutinas
    @Transactional(readOnly = true)
    public RoutineResponse findById(UUID coachId, UUID routineId) {
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(() -> new RoutineNotFoundException(routineId));
        if (!routine.isOwnedBy(coachId)) {
            log.warn("Acceso denegado: el entrenador {} intentó usar la rutina {}", coachId, routine.getId());
            throw RoutineAccessDeniedException.notOwner();
        }
        return RoutineResponse.from(routine);
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
