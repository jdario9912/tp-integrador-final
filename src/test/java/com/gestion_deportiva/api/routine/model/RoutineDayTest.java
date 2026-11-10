package com.gestion_deportiva.api.routine.model;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineDayTest {

    private Routine routine;

    private Exercise bench;

    @BeforeEach
    void setUp() {
        Coach coach = coach("ana@test.com");
        ReflectionTestUtils.setField(coach, "id", UUID.randomUUID());
        routine = routine("Fuerza", coach);
        bench = exercise("Press banca", MuscleGroup.CHEST, null);
    }

    @Test
    void shouldTrimTheNameAndRejectNull() {
        RoutineDay day = routine.addDay("  Empuje ");

        assertEquals("Empuje", day.getName());
        day.rename(" Tirón  ");
        assertEquals("Tirón", day.getName());
        assertThrows(NullPointerException.class, () -> day.rename(null));
    }

    @Test
    void addExerciseShouldAppendItWithItsPositionFromZero() {
        RoutineDay day = routine.addDay("Empuje");
        RoutineExercise first = routineExercise(bench);
        RoutineExercise second = routineExercise(bench);

        day.addExercise(first);
        day.addExercise(second);

        assertEquals(List.of(first, second), day.getExercises());
        assertEquals(0, first.getSortOrder());
        assertEquals(1, second.getSortOrder());
        assertSame(day, first.getRoutineDay());
    }

    @Test
    void replaceExercisesShouldReorderRemoveAndAdd() {
        // Arrange: ids para que equals distinga los ejercicios como lo hace JPA
        RoutineDay day = routine.addDay("Empuje");
        RoutineExercise first = withId(routineExercise(bench));
        RoutineExercise second = withId(routineExercise(bench));
        RoutineExercise removed = withId(routineExercise(bench));
        day.addExercise(first);
        day.addExercise(second);
        day.addExercise(removed);
        RoutineExercise added = routineExercise(bench);

        // Act
        day.replaceExercises(List.of(second, added, first));

        // Assert
        assertEquals(List.of(second, added, first), day.getExercises());
        assertEquals(0, second.getSortOrder());
        assertEquals(1, added.getSortOrder());
        assertEquals(2, first.getSortOrder());
        assertSame(day, added.getRoutineDay());
    }

    @Test
    void replaceExercisesShouldRejectAnExerciseOfAnotherDay() {
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        RoutineExercise exercise = withId(routineExercise(bench));
        push.addExercise(exercise);

        assertThrows(IllegalArgumentException.class, () -> pull.replaceExercises(List.of(exercise)));
        assertSame(push, exercise.getRoutineDay());
    }

    @Test
    void exercisesShouldNotBeModifiableFromOutside() {
        RoutineDay day = routine.addDay("Empuje");

        assertThrows(UnsupportedOperationException.class, () -> day.getExercises().add(routineExercise(bench)));
        assertTrue(day.getExercises().isEmpty());
    }

    @Test
    void routineExerciseBuilderShouldRequireTheExercise() {
        assertThrows(NullPointerException.class,
                () -> RoutineExercise.builder().sets((short) 3).reps((short) 10).build());
    }

    private static <T> T withId(T entity) {
        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
        return entity;
    }
}
