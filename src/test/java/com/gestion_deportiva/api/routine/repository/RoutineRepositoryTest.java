package com.gestion_deportiva.api.routine.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbc;

    private Coach ana;

    private Coach bruno;

    @BeforeEach
    void setUp() {
        ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
    }

    @Test
    void savesTheRoutineWithItsCoachDefaultsAndTimestamps() {
        Routine saved = routineRepository.saveAndFlush(routine("Fuerza", ana));

        Boolean isTemplate = jdbc.queryForObject(
                "select is_template from routines where id = ? and coach_id = ?", Boolean.class,
                saved.getId(), ana.getId());
        assertFalse(isTemplate);
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void duplicateNameForTheSameCoachIsRejectedByTheDatabaseIgnoringCase() {
        routineRepository.saveAndFlush(routine("Fuerza", ana));

        assertThrows(DataIntegrityViolationException.class,
                () -> routineRepository.saveAndFlush(routine("FUERZA", ana)));
    }

    @Test
    void sameNameIsAllowedForAnotherCoach() {
        routineRepository.saveAndFlush(routine("Fuerza", ana));
        routineRepository.saveAndFlush(routine("Fuerza", bruno));

        assertTrue(routineRepository.existsByCoachIdAndNameIgnoreCase(ana.getId(), "fuerza"));
        assertTrue(routineRepository.existsByCoachIdAndNameIgnoreCase(bruno.getId(), "FUERZA"));
    }

    @Test
    void existsByNameOnlyLooksAtTheCoachsRoutines() {
        routineRepository.saveAndFlush(routine("Fuerza", bruno));

        assertFalse(routineRepository.existsByCoachIdAndNameIgnoreCase(ana.getId(), "Fuerza"));
    }

    @Test
    void findByCoachIdReturnsOnlyTheCoachsRoutinesPaged() {
        // Arrange
        routineRepository.saveAndFlush(routine("B", ana));
        routineRepository.saveAndFlush(routine("A", ana));
        routineRepository.saveAndFlush(routine("C", ana));
        routineRepository.saveAndFlush(routine("Ajena", bruno));

        // Act
        Page<Routine> page = routineRepository.findByCoachId(ana.getId(), PageRequest.of(0, 2, Sort.by("name")));

        // Assert
        assertEquals(3, page.getTotalElements());
        assertEquals(List.of("A", "B"), page.getContent().stream().map(Routine::getName).toList());
    }

    @Test
    void blankNameIsRejectedByTheDatabase() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into routines (coach_id, name) values (?, '  ')", ana.getId()));
    }

    @ParameterizedTest
    @CsvSource({"days_per_week, 0", "days_per_week, 8", "duration_weeks, 0", "duration_weeks, 53"})
    void outOfRangeValuesAreRejectedByTheDatabase(String column, int value) {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into routines (coach_id, name, " + column + ") values (?, 'X', ?)", ana.getId(), value));
    }

    // ---------- días y ejercicios (US-14) ----------

    @Test
    void savesTheDaysAndExercisesInCascadeAndLoadsThemInOrder() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise row = exerciseRepository.saveAndFlush(exercise("Remo", MuscleGroup.BACK, ana));
        Routine routine = routine("Fuerza", ana);
        RoutineDay push = routine.addDay("Empuje");
        push.addExercise(routineExercise(bench));
        push.addExercise(routineExercise(row));
        routine.addDay("Tirón");

        // Act
        Routine saved = routineRepository.saveAndFlush(routine);
        entityManager.clear();
        Routine loaded = routineRepository.findById(saved.getId()).orElseThrow();

        // Assert
        assertEquals(List.of("Empuje", "Tirón"), loaded.getDays().stream().map(RoutineDay::getName).toList());
        RoutineDay loadedPush = loaded.getDays().get(0);
        assertEquals(List.of("Press banca", "Remo"),
                loadedPush.getExercises().stream().map(e -> e.getExercise().getName()).toList());
        RoutineExercise planned = loadedPush.getExercises().get(0);
        assertEquals(4, planned.getSets());
        assertEquals(10, planned.getReps());
        assertEquals(new BigDecimal("60.50"), planned.getRecommendedWeight());
        assertEquals((short) 90, planned.getRest());
        assertEquals("RIR 2", planned.getRirRpe());
        assertEquals("Bajar en 3 segundos", planned.getTechniqueNote());
    }

    @Test
    void reorderingTheDaysAndExercisesDoesNotViolateTheUniquePositions() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Routine routine = routine("Fuerza", ana);
        RoutineDay push = routine.addDay("Empuje");
        RoutineDay pull = routine.addDay("Tirón");
        RoutineExercise first = routineExercise(bench);
        RoutineExercise second = routineExercise(bench);
        push.addExercise(first);
        push.addExercise(second);
        routineRepository.saveAndFlush(routine);

        // Act: los días y los ejercicios intercambian su posición
        routine.replaceDays(List.of(pull, push));
        push.replaceExercises(List.of(second, first));
        routineRepository.flush();
        // Las restricciones únicas son diferidas: se fuerza su chequeo antes del rollback del test
        jdbc.execute("SET CONSTRAINTS ALL IMMEDIATE");

        // Assert
        assertEquals(1, jdbc.queryForObject("select day_number from routine_days where id = ?", Integer.class,
                pull.getId()));
        assertEquals(0, jdbc.queryForObject("select sort_order from routine_exercises where id = ?", Integer.class,
                second.getId()));
    }

    @Test
    void removingADayDeletesItAndItsExercises() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Routine routine = routine("Fuerza", ana);
        routine.addDay("Empuje").addExercise(routineExercise(bench));
        RoutineDay pull = routine.addDay("Tirón");
        routineRepository.saveAndFlush(routine);

        // Act
        routine.replaceDays(List.of(pull));
        routineRepository.flush();

        // Assert
        assertEquals(1, count("routine_days"));
        assertEquals(0, count("routine_exercises"));
    }

    @Test
    void deletingTheRoutineDeletesItsStructureInTheDatabase() {
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Routine routine = routine("Fuerza", ana);
        routine.addDay("Empuje").addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(routine);

        jdbc.update("delete from routines where id = ?", routine.getId());

        assertEquals(0, count("routine_days"));
        assertEquals(0, count("routine_exercises"));
    }

    @Test
    void exerciseIsUsedInRoutinesOnlyWhileARoutinePlansIt() {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise row = exerciseRepository.saveAndFlush(exercise("Remo", MuscleGroup.BACK, ana));
        Routine routine = routine("Fuerza", ana);
        RoutineDay day = routine.addDay("Empuje");
        day.addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(routine);

        // Assert
        assertTrue(exerciseRepository.isUsedInRoutines(bench.getId()));
        assertFalse(exerciseRepository.isUsedInRoutines(row.getId()));

        // Act + Assert: al quitarlo de la rutina deja de estar en uso
        day.replaceExercises(List.of());
        routineRepository.flush();
        assertFalse(exerciseRepository.isUsedInRoutines(bench.getId()));
    }

    // Columnas: sort_order, sets, reps, recommended_weight_kg, rest_seconds (una sola inválida por caso)
    @ParameterizedTest
    @CsvSource({"-1, 3, 10, 0, 0", "0, 0, 10, 0, 0", "0, 3, 0, 0, 0", "0, 3, 10, -1, 0", "0, 3, 10, 0, -1"})
    void invalidExerciseValuesAreRejectedByTheDatabase(int sortOrder, int sets, int reps, int weight, int rest) {
        // Arrange
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Routine routine = routine("Fuerza", ana);
        RoutineDay day = routine.addDay("Empuje");
        routineRepository.saveAndFlush(routine);

        // Act + Assert
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into routine_exercises (routine_day_id, exercise_id, sort_order, sets, reps, "
                        + "recommended_weight_kg, rest_seconds) values (?, ?, ?, ?, ?, ?, ?)",
                day.getId(), bench.getId(), sortOrder, sets, reps, weight, rest));
    }

    @Test
    void blankDayNameIsRejectedByTheDatabase() {
        Routine routine = routineRepository.saveAndFlush(routine("Fuerza", ana));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into routine_days (routine_id, day_number, name) values (?, 1, '  ')", routine.getId()));
    }

    private int count(String table) {
        Integer count = jdbc.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }
}
