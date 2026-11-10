package com.gestion_deportiva.api.routine.service;

import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.exercise.exception.ExerciseNotFoundException;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.dto.RoutineDayRequest;
import com.gestion_deportiva.api.routine.dto.RoutineDetailResponse;
import com.gestion_deportiva.api.routine.dto.RoutineExerciseRequest;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.dto.RoutineResponse;
import com.gestion_deportiva.api.routine.dto.RoutineStructureRequest;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.exception.RoutineHasPerformedSetsException;
import com.gestion_deportiva.api.routine.exception.RoutineItemNotInRoutineException;
import com.gestion_deportiva.api.routine.exception.RoutineNameAlreadyExistsException;
import com.gestion_deportiva.api.routine.exception.RoutineNotFoundException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// Rutinas del entrenador (US-13, US-14, US-15). Recibe el id del entrenador y no el principal, igual que ExerciseService
@Slf4j
@Service
@RequiredArgsConstructor
public class RoutineService {

    // Orden fijo del listado: el "sort" del cliente se ignora (ver ExerciseService.CATALOG_SORT).
    // El id desempata para que la paginación sea estable
    static final Sort MY_ROUTINES_SORT = Sort.by("name", "id");

    static final String COPY_PREFIX = "Copia de ";
    private static final int NAME_MAX_LENGTH = 100;

    private final RoutineRepository routineRepository;
    private final CoachRepository coachRepository;
    private final ExerciseRepository exerciseRepository;
    private final PerformedSetChecker performedSetChecker;

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

    @Transactional(readOnly = true)
    public RoutineDetailResponse findById(UUID coachId, UUID routineId) {
        return RoutineDetailResponse.from(findOwned(coachId, routineId));
    }

    // Edita los datos de la rutina (US-15). Reemplaza todos los campos, igual que el alta
    @Transactional
    public RoutineDetailResponse update(UUID coachId, UUID routineId, RoutineRequest request) {
        Routine routine = findOwned(coachId, routineId);

        String name = request.name().trim();
        if (routineRepository.existsByCoachIdAndNameIgnoreCaseAndIdNot(coachId, name, routineId)) {
            throw new RoutineNameAlreadyExistsException(name);
        }

        routine.rename(name);
        routine.setDescription(blankToNull(request.description()));
        routine.setGoal(blankToNull(request.goal()));
        routine.setDaysPerWeek(request.daysPerWeek());
        routine.setDurationWeeks(request.durationWeeks());
        routine.setTemplate(Boolean.TRUE.equals(request.isTemplate()));

        // Flush acá por el mismo motivo que en create: un nombre que choca en paralelo sale como 409.
        // La rutina ya está gestionada: save haría un merge innecesario
        routineRepository.flush();
        return RoutineDetailResponse.from(routine);
    }

    // Reemplaza la estructura completa (US-14). Los días y ejercicios con id se conservan (las series de US-19
    // apuntan a ellos), los que no tienen id se crean y los que no vienen se borran
    @Transactional
    public RoutineDetailResponse replaceStructure(UUID coachId, UUID routineId, RoutineStructureRequest request) {
        Routine routine = findOwned(coachId, routineId);

        Map<UUID, RoutineDay> currentDays = routine.getDays().stream()
                .collect(Collectors.toMap(RoutineDay::getId, Function.identity()));
        Map<UUID, RoutineExercise> currentExercises = routine.getDays().stream()
                .flatMap(day -> day.getExercises().stream())
                .collect(Collectors.toMap(RoutineExercise::getId, Function.identity()));

        validateIds(request, currentDays, currentExercises);
        Map<UUID, Exercise> catalog = loadCatalogExercises(coachId, request, currentExercises);

        Set<UUID> removedExercises = new HashSet<>(currentExercises.keySet());
        request.days().forEach(day -> day.exercisesOrEmpty().forEach(exercise -> removedExercises.remove(exercise.id())));
        if (!removedExercises.isEmpty() && performedSetChecker.hasPerformedSets(removedExercises)) {
            throw new RoutineHasPerformedSetsException();
        }

        List<RoutineDay> days = new ArrayList<>();
        for (RoutineDayRequest dayRequest : request.days()) {
            RoutineDay day = dayRequest.id() != null ? currentDays.get(dayRequest.id()) : routine.newDay(dayRequest.name());
            day.rename(dayRequest.name());

            List<RoutineExercise> exercises = new ArrayList<>();
            for (RoutineExerciseRequest exerciseRequest : dayRequest.exercisesOrEmpty()) {
                exercises.add(toRoutineExercise(exerciseRequest, currentExercises, catalog));
            }
            day.replaceExercises(exercises);
            days.add(day);
        }
        routine.replaceDays(days);

        // Flush para que los nuevos tengan id en la respuesta y las restricciones de la base se evalúen acá.
        // Sin save: un merge de la rutina gestionada deja a Hibernate intentando borrar dos veces los
        // ejercicios quitados (orphanRemoval) en el flush siguiente
        routineRepository.flush();
        return RoutineDetailResponse.from(routine);
    }

    // Copia independiente con días y ejercicios (US-15): "Copia de X", o "Copia de X (2)", "(3)"... si el nombre
    // ya está usado
    @Transactional
    public RoutineDetailResponse duplicate(UUID coachId, UUID routineId) {
        Routine original = findOwned(coachId, routineId);

        int attempt = 1;
        String name = copyName(original.getName(), attempt);
        while (routineRepository.existsByCoachIdAndNameIgnoreCase(coachId, name)) {
            name = copyName(original.getName(), ++attempt);
        }

        // Como en create, una copia simultánea con el mismo nombre termina en 409
        return RoutineDetailResponse.from(routineRepository.saveAndFlush(original.duplicate(name)));
    }

    // Recorta el nombre original para que el sufijo siempre entre en los 100 caracteres
    static String copyName(String originalName, int attempt) {
        String suffix = attempt == 1 ? "" : " (" + attempt + ")";
        String base = COPY_PREFIX + originalName;
        int maxBaseLength = NAME_MAX_LENGTH - suffix.length();
        if (base.length() > maxBaseLength) {
            base = base.substring(0, maxBaseLength).trim();
        }
        return base + suffix;
    }

    // 404 si no existe; 403 si es de otro entrenador. Los ids son UUID: distinguir los dos casos
    // no permite enumerar rutinas. Público para los módulos que usan rutinas del entrenador (asignaciones, US-16)
    public Routine findOwned(UUID coachId, UUID routineId) {
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(() -> new RoutineNotFoundException(routineId));
        if (!routine.isOwnedBy(coachId)) {
            log.warn("Acceso denegado: el entrenador {} intentó usar la rutina {}", coachId, routine.getId());
            throw RoutineAccessDeniedException.notOwner();
        }
        return routine;
    }

    // Cada id tiene que ser de esta rutina, aparecer una sola vez y, en los ejercicios, seguir en su mismo día
    private static void validateIds(RoutineStructureRequest request, Map<UUID, RoutineDay> currentDays,
                                    Map<UUID, RoutineExercise> currentExercises) {
        Set<UUID> seen = new HashSet<>();
        for (int i = 0; i < request.days().size(); i++) {
            RoutineDayRequest day = request.days().get(i);
            String dayField = "days[" + i + "]";
            if (day.id() != null) {
                if (!currentDays.containsKey(day.id())) {
                    throw RoutineItemNotInRoutineException.day(dayField + ".id");
                }
                if (!seen.add(day.id())) {
                    throw RoutineItemNotInRoutineException.repeated(dayField + ".id");
                }
            }
            List<RoutineExerciseRequest> exercises = day.exercisesOrEmpty();
            for (int j = 0; j < exercises.size(); j++) {
                UUID exerciseId = exercises.get(j).id();
                if (exerciseId == null) {
                    continue;
                }
                String exerciseField = dayField + ".exercises[" + j + "].id";
                RoutineExercise current = currentExercises.get(exerciseId);
                if (current == null || day.id() == null || !day.id().equals(current.getRoutineDay().getId())) {
                    throw RoutineItemNotInRoutineException.exercise(exerciseField);
                }
                if (!seen.add(exerciseId)) {
                    throw RoutineItemNotInRoutineException.repeated(exerciseField);
                }
            }
        }
    }

    // Busca en el catálogo los ejercicios nuevos o cambiados. Los que ya estaban en la rutina con el mismo
    // ejercicio no se vuelven a validar: si después se eliminó del catálogo, la rutina se sigue pudiendo guardar
    private Map<UUID, Exercise> loadCatalogExercises(UUID coachId, RoutineStructureRequest request,
                                                     Map<UUID, RoutineExercise> currentExercises) {
        Set<UUID> needed = new HashSet<>();
        request.days().forEach(day -> day.exercisesOrEmpty().forEach(exercise -> {
            RoutineExercise current = exercise.id() != null ? currentExercises.get(exercise.id()) : null;
            if (current == null || !current.getExercise().getId().equals(exercise.exerciseId())) {
                needed.add(exercise.exerciseId());
            }
        }));
        if (needed.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Exercise> found = new HashMap<>();
        exerciseRepository.findVisibleByIdIn(coachId, needed).forEach(exercise -> found.put(exercise.getId(), exercise));
        needed.stream()
                .filter(id -> !found.containsKey(id))
                .findFirst()
                .ifPresent(id -> {
                    throw new ExerciseNotFoundException(id);
                });
        return found;
    }

    private static RoutineExercise toRoutineExercise(RoutineExerciseRequest request,
                                                     Map<UUID, RoutineExercise> currentExercises,
                                                     Map<UUID, Exercise> catalog) {
        RoutineExercise routineExercise;
        if (request.id() != null) {
            routineExercise = currentExercises.get(request.id());
            Exercise exercise = catalog.get(request.exerciseId());
            if (exercise != null) {
                routineExercise.setExercise(exercise);
            }
            routineExercise.setSets(request.sets().shortValue());
            routineExercise.setReps(request.reps().shortValue());
            routineExercise.setRecommendedWeight(request.recommendedWeight());
            routineExercise.setRest(toShort(request.rest()));
            routineExercise.setRirRpe(normalizeRirRpe(request.rirRpe()));
            routineExercise.setTechniqueNote(blankToNull(request.techniqueNote()));
        } else {
            routineExercise = RoutineExercise.builder()
                    .exercise(catalog.get(request.exerciseId()))
                    .sets(request.sets().shortValue())
                    .reps(request.reps().shortValue())
                    .recommendedWeight(request.recommendedWeight())
                    .rest(toShort(request.rest()))
                    .rirRpe(normalizeRirRpe(request.rirRpe()))
                    .techniqueNote(blankToNull(request.techniqueNote()))
                    .build();
        }
        return routineExercise;
    }

    // "rpe8.5" → "RPE 8.5". El formato ya lo validó @ValidRirRpe
    static String normalizeRirRpe(String rirRpe) {
        String value = blankToNull(rirRpe);
        if (value == null) {
            return null;
        }
        String upper = value.toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        return upper.substring(0, 3) + " " + upper.substring(3);
    }

    private static Short toShort(Integer value) {
        return value == null ? null : value.shortValue();
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
