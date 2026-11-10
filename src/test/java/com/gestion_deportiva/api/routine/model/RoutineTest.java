package com.gestion_deportiva.api.routine.model;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineTest {

    @Test
    void shouldBeOwnedOnlyByItsCoach() {
        // Arrange
        Coach coach = coachWithId();
        Routine routine = routine("Fuerza", coach);

        // Assert
        assertTrue(routine.isOwnedBy(coach.getId()));
        assertFalse(routine.isOwnedBy(UUID.randomUUID()));
        assertFalse(routine.isOwnedBy(null));
    }

    @Test
    void shouldNotBeOwnedByAnyoneWhileTheCoachHasNoId() {
        assertFalse(routine("Fuerza", coach("ana@test.com")).isOwnedBy(UUID.randomUUID()));
    }

    @Test
    void shouldTrimTheName() {
        Routine routine = routine("  Fuerza 4 días  ", coachWithId());

        assertEquals("Fuerza 4 días", routine.getName());

        routine.rename("  Hipertrofia ");
        assertEquals("Hipertrofia", routine.getName());
    }

    @Test
    void shouldRejectNullNameOrCoach() {
        assertThrows(NullPointerException.class, () -> routine(null, coachWithId()));
        assertThrows(NullPointerException.class, () -> routine("Fuerza", null));
    }

    @Test
    void shouldNotBeATemplateByDefault() {
        Routine routine = routine("Fuerza", coachWithId());

        assertFalse(routine.isTemplate());
        assertNull(routine.getDescription());
        assertNull(routine.getGoal());
        assertNull(routine.getDaysPerWeek());
        assertNull(routine.getDurationWeeks());
    }

    @Test
    void shouldBuildWithAllFields() {
        // Arrange
        Coach coach = coachWithId();

        // Act
        Routine routine = Routine.builder()
                .name("  Fuerza ")
                .coach(coach)
                .description("Bloques de 4 semanas")
                .goal("Hipertrofia")
                .daysPerWeek((short) 4)
                .durationWeeks((short) 12)
                .template(true)
                .build();

        // Assert: el builder pasa por el constructor, así que también normaliza el nombre
        assertEquals("Fuerza", routine.getName());
        assertSame(coach, routine.getCoach());
        assertEquals("Bloques de 4 semanas", routine.getDescription());
        assertEquals("Hipertrofia", routine.getGoal());
        assertEquals((short) 4, routine.getDaysPerWeek());
        assertEquals((short) 12, routine.getDurationWeeks());
        assertTrue(routine.isTemplate());
    }

    @Test
    void builderShouldRejectMissingRequiredFields() {
        assertThrows(NullPointerException.class, () -> Routine.builder().coach(coachWithId()).build());
        assertThrows(NullPointerException.class, () -> Routine.builder().name("Fuerza").build());
    }

    // ---------- días (US-14) ----------

    @Test
    void shouldNumberTheDaysInTheOrderTheyAreAdded() {
        Routine routine = routine("Fuerza", coachWithId());

        RoutineDay first = routine.addDay(" Empuje ");
        RoutineDay second = routine.addDay("Tirón");

        assertEquals(List.of(first, second), routine.getDays());
        assertEquals(1, first.getDayNumber());
        assertEquals(2, second.getDayNumber());
        assertEquals("Empuje", first.getName());
        assertSame(routine, first.getRoutine());
    }

    @Test
    void replaceDaysShouldReorderRemoveAndAddRenumberingFromOne() {
        // Arrange: ids para que equals distinga los días como lo hace JPA
        Routine routine = routine("Fuerza", coachWithId());
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        withId(routine.addDay("Piernas"));
        RoutineDay full = routine.newDay("Full body");

        // Act: se invierte el orden, "Piernas" sale y "Full body" entra al principio
        routine.replaceDays(List.of(full, pull, push));

        // Assert
        assertEquals(List.of(full, pull, push), routine.getDays());
        assertEquals(1, full.getDayNumber());
        assertEquals(2, pull.getDayNumber());
        assertEquals(3, push.getDayNumber());
    }

    @Test
    void replaceDaysWithAnEmptyListShouldRemoveAllTheDays() {
        Routine routine = routine("Fuerza", coachWithId());
        withId(routine.addDay("Empuje"));

        routine.replaceDays(List.of());

        assertTrue(routine.getDays().isEmpty());
    }

    @Test
    void replaceDaysShouldRejectADayOfAnotherRoutine() {
        Routine routine = routine("Fuerza", coachWithId());
        RoutineDay foreign = routine("Otra", coachWithId()).addDay("Empuje");

        assertThrows(IllegalArgumentException.class, () -> routine.replaceDays(List.of(foreign)));
    }

    @Test
    void daysShouldNotBeModifiableFromOutside() {
        Routine routine = routine("Fuerza", coachWithId());

        assertThrows(UnsupportedOperationException.class, () -> routine.getDays().add(routine.newDay("Empuje")));
    }

    // ---------- duplicar (US-15) ----------

    @Test
    void duplicateShouldCopyTheDataDaysAndExercisesIntoNewObjects() {
        // Arrange
        Coach coach = coachWithId();
        Routine original = Routine.builder().name("Fuerza").coach(coach).description("Bloques").goal("Fuerza")
                .daysPerWeek((short) 2).durationWeeks((short) 8).template(true).build();
        Exercise bench = exercise("Press banca", MuscleGroup.CHEST, null);
        RoutineDay push = original.addDay("Empuje");
        push.addExercise(routineExercise(bench));
        original.addDay("Tirón");

        // Act
        Routine copy = original.duplicate("Copia de Fuerza");

        // Assert: datos
        assertEquals("Copia de Fuerza", copy.getName());
        assertSame(coach, copy.getCoach());
        assertEquals("Bloques", copy.getDescription());
        assertEquals("Fuerza", copy.getGoal());
        assertEquals((short) 2, copy.getDaysPerWeek());
        assertEquals((short) 8, copy.getDurationWeeks());
        assertTrue(copy.isTemplate());

        // Assert: estructura copiada en objetos nuevos
        assertEquals(2, copy.getDays().size());
        RoutineDay pushCopy = copy.getDays().get(0);
        assertNotSame(push, pushCopy);
        assertSame(copy, pushCopy.getRoutine());
        assertEquals("Empuje", pushCopy.getName());
        assertEquals(1, pushCopy.getDayNumber());
        assertEquals("Tirón", copy.getDays().get(1).getName());

        RoutineExercise exerciseCopy = pushCopy.getExercises().get(0);
        RoutineExercise originalExercise = push.getExercises().get(0);
        assertNotSame(originalExercise, exerciseCopy);
        assertSame(pushCopy, exerciseCopy.getRoutineDay());
        assertSame(bench, exerciseCopy.getExercise());
        assertEquals(originalExercise.getSets(), exerciseCopy.getSets());
        assertEquals(originalExercise.getReps(), exerciseCopy.getReps());
        assertEquals(originalExercise.getRecommendedWeight(), exerciseCopy.getRecommendedWeight());
        assertEquals(originalExercise.getRest(), exerciseCopy.getRest());
        assertEquals(originalExercise.getRirRpe(), exerciseCopy.getRirRpe());
        assertEquals(originalExercise.getTechniqueNote(), exerciseCopy.getTechniqueNote());

        // El original no cambia
        assertEquals(1, push.getExercises().size());
        assertSame(push, originalExercise.getRoutineDay());
    }

    @Test
    void duplicateOfARoutineWithoutDaysShouldHaveNoDays() {
        assertTrue(routine("Fuerza", coachWithId()).duplicate("Copia de Fuerza").getDays().isEmpty());
    }

    @Test
    void shouldNotBeCompleteWithoutDays() {
        assertFalse(routine("Fuerza", coachWithId()).isComplete());
    }

    @Test
    void shouldNotBeCompleteWhenADayHasNoExercises() {
        // Arrange
        Routine routine = routine("Fuerza", coachWithId());
        routine.addDay("Empuje").addExercise(routineExercise(exercise("Press banca", MuscleGroup.CHEST, null)));
        routine.addDay("Tirón");

        // Assert
        assertFalse(routine.isComplete());
    }

    @Test
    void shouldBeCompleteWhenEveryDayHasExercises() {
        Routine routine = routine("Fuerza", coachWithId());
        routine.addDay("Empuje").addExercise(routineExercise(exercise("Press banca", MuscleGroup.CHEST, null)));
        routine.addDay("Tirón").addExercise(routineExercise(exercise("Remo", MuscleGroup.BACK, null)));

        assertTrue(routine.isComplete());
    }

    private static <T> T withId(T entity) {
        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
        return entity;
    }

    private static Coach coachWithId() {
        Coach coach = coach("ana@test.com");
        ReflectionTestUtils.setField(coach, "id", UUID.randomUUID());
        return coach;
    }
}
