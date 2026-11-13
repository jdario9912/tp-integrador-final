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
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Días de la rutina con sus ejercicios en una sola consulta (US-17). Cada test vacía el contexto de persistencia
// antes de consultar: así lo que se lee sale de la consulta y no de las entidades que quedaron en memoria
class RoutineDayRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private RoutineDayRepository routineDayRepository;

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private EntityManager entityManager;

    private Coach ana;

    private Exercise bench;

    private Exercise row;

    private Exercise squat;

    // Torso (press, remo), Pierna (sentadilla) y Movilidad (sin ejercicios)
    private Routine strength;

    @BeforeEach
    void setUp() {
        ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        // Ejercicios propios del entrenador: no chocan con los globales precargados por la V3
        bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        row = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, ana));
        squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana));

        strength = routine("Fuerza", ana);
        RoutineDay upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(routineExercise(row));
        strength.addDay("Pierna").addExercise(routineExercise(squat));
        strength.addDay("Movilidad");
        strength = routineRepository.saveAndFlush(strength);
    }

    @Test
    void shouldReturnTheDaysInOrderWithTheirExercisesInOrder() {
        // Arrange
        entityManager.clear();

        // Act
        List<RoutineDay> days = routineDayRepository.findWithExercisesByRoutineId(strength.getId());

        // Assert: un elemento por día (sin repetidos por el join) y día sin ejercicios con la lista vacía
        assertEquals(List.of("Torso", "Pierna", "Movilidad"), names(days));
        assertEquals(List.of((short) 1, (short) 2, (short) 3), days.stream().map(RoutineDay::getDayNumber).toList());
        assertEquals(List.of("Press banca", "Remo bajo"), exerciseNames(days.get(0)));
        assertEquals(List.of((short) 0, (short) 1),
                days.get(0).getExercises().stream().map(RoutineExercise::getSortOrder).toList());
        assertEquals(List.of("Sentadilla"), exerciseNames(days.get(1)));
        assertTrue(days.get(2).getExercises().isEmpty());
    }

    @Test
    void shouldLoadTheExercisesAndTheirCatalogExerciseInTheSameQuery() {
        // Arrange
        entityManager.clear();

        // Act
        List<RoutineDay> days = routineDayRepository.findWithExercisesByRoutineId(strength.getId());

        // Assert: la colección (el campo, no la vista inmodificable del getter) y el ejercicio del catálogo ya
        // vienen cargados, así que armar la respuesta no dispara más consultas (sin N+1)
        for (RoutineDay day : days) {
            assertTrue(Hibernate.isInitialized(ReflectionTestUtils.getField(day, "exercises")), day.getName());
            day.getExercises().forEach(exercise ->
                    assertTrue(Hibernate.isInitialized(exercise.getExercise()), exercise.getExercise().getName()));
        }
    }

    @Test
    void shouldFollowTheCurrentOrderAfterTheCoachReordersTheRoutine() {
        // Arrange: Pierna pasa a ser el día 1 y en Torso el remo pasa adelante (como PUT /routines/{id}/days)
        RoutineDay upper = strength.getDays().get(0);
        RoutineDay lower = strength.getDays().get(1);
        RoutineDay mobility = strength.getDays().get(2);
        strength.replaceDays(List.of(lower, upper, mobility));
        upper.replaceExercises(List.of(upper.getExercises().get(1), upper.getExercises().get(0)));
        entityManager.flush();
        entityManager.clear();

        // Act
        List<RoutineDay> days = routineDayRepository.findWithExercisesByRoutineId(strength.getId());

        // Assert
        assertEquals(List.of("Pierna", "Torso", "Movilidad"), names(days));
        assertEquals(List.of("Remo bajo", "Press banca"), exerciseNames(days.get(1)));
    }

    @Test
    void shouldReturnOnlyTheDaysOfThatRoutine() {
        // Arrange
        Routine other = routine("Otra", ana);
        other.addDay("Full body").addExercise(routineExercise(bench));
        routineRepository.saveAndFlush(other);
        entityManager.clear();

        // Act + Assert
        assertEquals(List.of("Full body"), names(routineDayRepository.findWithExercisesByRoutineId(other.getId())));
        assertEquals(3, routineDayRepository.findWithExercisesByRoutineId(strength.getId()).size());
        assertTrue(routineDayRepository.findWithExercisesByRoutineId(UUID.randomUUID()).isEmpty());
    }

    @Test
    void shouldReturnNoDaysForARoutineWithoutStructure() {
        Routine empty = routineRepository.saveAndFlush(routine("Vacía", ana));
        entityManager.clear();

        assertTrue(routineDayRepository.findWithExercisesByRoutineId(empty.getId()).isEmpty());
    }

    private static List<String> names(List<RoutineDay> days) {
        return days.stream().map(RoutineDay::getName).toList();
    }

    private static List<String> exerciseNames(RoutineDay day) {
        return day.getExercises().stream().map(exercise -> exercise.getExercise().getName()).toList();
    }
}
