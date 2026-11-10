package com.gestion_deportiva.api.exercise.service;

import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.exercise.dto.ExerciseRequest;
import com.gestion_deportiva.api.exercise.dto.ExerciseResponse;
import com.gestion_deportiva.api.exercise.dto.ExerciseSearchFilter;
import com.gestion_deportiva.api.exercise.exception.ExerciseAccessDeniedException;
import com.gestion_deportiva.api.exercise.exception.ExerciseInUseException;
import com.gestion_deportiva.api.exercise.exception.ExerciseNameAlreadyExistsException;
import com.gestion_deportiva.api.exercise.exception.ExerciseNotFoundException;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

import static com.gestion_deportiva.api.exercise.repository.ExerciseSpecifications.muscleGroupIs;
import static com.gestion_deportiva.api.exercise.repository.ExerciseSpecifications.nameContains;
import static com.gestion_deportiva.api.exercise.repository.ExerciseSpecifications.visibleTo;

// Catálogo de ejercicios (US-38). Recibe el id del entrenador y no el principal, igual que AthleteService
@Service
@RequiredArgsConstructor
public class ExerciseService {

    private static final Logger log = LoggerFactory.getLogger(ExerciseService.class);

    // Orden fijo del listado: el "sort" del cliente se ignora (ver AthleteService.MY_ATHLETES_SORT).
    // El id desempata para que la paginación sea estable
    static final Sort CATALOG_SORT = Sort.by("name", "id");

    private final ExerciseRepository exerciseRepository;
    private final CoachRepository coachRepository;
    private final Clock clock;

    @Transactional
    public ExerciseResponse create(UUID coachId, ExerciseRequest request) {
        // Con un coach autenticado siempre existe; cubre el caso de que se haya borrado después de autenticarse
        Coach coach = coachRepository.findById(coachId)
                .orElseThrow(() -> new CoachNotFoundException(coachId));

        String name = request.name().trim();
        if (exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(coachId, name)) {
            throw new ExerciseNameAlreadyExistsException(name);
        }

        Exercise exercise = Exercise.builder()
                .name(name)
                .muscleGroup(request.muscleGroup())
                .createdBy(coach)
                .description(blankToNull(request.description()))
                .videoUrl(blankToNull(request.videoUrl()))
                .build();

        // saveAndFlush ejecuta el INSERT acá: si dos altas simultáneas chocan contra ux_exercises_coach_name,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler (409)
        return ExerciseResponse.from(exerciseRepository.saveAndFlush(exercise));
    }

    // Globales + propios, con filtros opcionales por nombre y grupo muscular
    @Transactional(readOnly = true)
    public PageResponse<ExerciseResponse> findVisible(UUID coachId, ExerciseSearchFilter filter, Pageable pageable) {
        Specification<Exercise> spec = Specification.allOf(
                visibleTo(coachId),
                nameContains(filter.name()),
                muscleGroupIs(filter.muscleGroup()));
        Pageable page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), CATALOG_SORT);
        return PageResponse.from(exerciseRepository.findAll(spec, page).map(ExerciseResponse::from));
    }

    // Lectura: globales y propios. El de otro entrenador responde 403
    @Transactional(readOnly = true)
    public ExerciseResponse findById(UUID coachId, UUID exerciseId) {
        Exercise exercise = findExisting(exerciseId);
        if (!exercise.isGlobal() && !exercise.isOwnedBy(coachId)) {
            throw denied(coachId, exercise, ExerciseAccessDeniedException.notOwner());
        }
        return ExerciseResponse.from(exercise);
    }

    // Edición completa: los opcionales que no vengan quedan en null. La autoría no cambia
    @Transactional
    public ExerciseResponse update(UUID coachId, UUID exerciseId, ExerciseRequest request) {
        Exercise exercise = findEditable(coachId, exerciseId);

        // Solo se consulta si cambia: el propio nombre (en otras mayúsculas) no es un duplicado
        String name = request.name().trim();
        if (!name.equalsIgnoreCase(exercise.getName())
                && exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(coachId, name)) {
            throw new ExerciseNameAlreadyExistsException(name);
        }

        exercise.rename(name);
        exercise.setMuscleGroup(request.muscleGroup());
        exercise.setDescription(blankToNull(request.description()));
        exercise.setVideoUrl(blankToNull(request.videoUrl()));

        // saveAndFlush: igual que en create, una carrera contra el índice único sale como 409
        return ExerciseResponse.from(exerciseRepository.saveAndFlush(exercise));
    }

    // Baja lógica: sale del catálogo y su nombre queda libre. Si alguna rutina lo usa responde 422: las rutinas
    // cargan sus ejercicios por JPA y un eliminado no se puede leer (@SQLRestriction de Exercise)
    @Transactional
    public void delete(UUID coachId, UUID exerciseId) {
        Exercise exercise = findEditable(coachId, exerciseId);
        if (exerciseRepository.isUsedInRoutines(exerciseId)) {
            throw new ExerciseInUseException();
        }
        exercise.markDeleted(clock.instant());
        exerciseRepository.saveAndFlush(exercise);
    }

    // 404 si no existe o está eliminado; 403 si es global o de otro entrenador.
    // Los ids son UUID: distinguir los dos casos no permite enumerar ejercicios
    private Exercise findEditable(UUID coachId, UUID exerciseId) {
        Exercise exercise = findExisting(exerciseId);
        if (exercise.isGlobal()) {
            throw denied(coachId, exercise, ExerciseAccessDeniedException.global());
        }
        if (!exercise.isOwnedBy(coachId)) {
            throw denied(coachId, exercise, ExerciseAccessDeniedException.notOwner());
        }
        return exercise;
    }

    private Exercise findExisting(UUID exerciseId) {
        return exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ExerciseNotFoundException(exerciseId));
    }

    private static ExerciseAccessDeniedException denied(UUID coachId, Exercise exercise,
                                                        ExerciseAccessDeniedException ex) {
        log.warn("Acceso denegado: el entrenador {} intentó usar el ejercicio {}", coachId, exercise.getId());
        return ex;
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
