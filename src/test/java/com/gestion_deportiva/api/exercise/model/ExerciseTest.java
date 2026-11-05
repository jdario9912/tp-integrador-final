package com.gestion_deportiva.api.exercise.model;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExerciseTest {

    @Test
    void shouldBeGlobalWhenItHasNoAuthor() {
        Exercise global = exercise("Sentadilla", MuscleGroup.QUADRICEPS, null);

        assertTrue(global.isGlobal());
        assertFalse(global.isOwnedBy(UUID.randomUUID()));
    }

    @Test
    void shouldBeOwnedOnlyByItsAuthor() {
        // Arrange
        Coach author = coachWithId();
        Exercise exercise = exercise("Sentadilla", MuscleGroup.QUADRICEPS, author);

        // Assert
        assertFalse(exercise.isGlobal());
        assertTrue(exercise.isOwnedBy(author.getId()));
        assertFalse(exercise.isOwnedBy(UUID.randomUUID()));
        assertFalse(exercise.isOwnedBy(null));
    }

    @Test
    void shouldTrimTheName() {
        Exercise exercise = exercise("  Press de banca  ", MuscleGroup.CHEST, null);

        assertEquals("Press de banca", exercise.getName());

        exercise.rename("  Press inclinado ");
        assertEquals("Press inclinado", exercise.getName());
    }

    @Test
    void shouldRejectNullNameOrMuscleGroup() {
        assertThrows(NullPointerException.class, () -> exercise(null, MuscleGroup.CHEST, null));
        assertThrows(NullPointerException.class, () -> exercise("Press", null, null));
    }

    @Test
    void shouldBuildWithAllFields() {
        // Arrange
        Coach author = coachWithId();

        // Act
        Exercise exercise = Exercise.builder()
                .name("  Press de banca ")
                .muscleGroup(MuscleGroup.CHEST)
                .createdBy(author)
                .description("Bajar la barra al pecho")
                .videoUrl("https://video.com/press")
                .build();

        // Assert: el builder pasa por el constructor, así que también normaliza el nombre
        assertEquals("Press de banca", exercise.getName());
        assertEquals(MuscleGroup.CHEST, exercise.getMuscleGroup());
        assertTrue(exercise.isOwnedBy(author.getId()));
        assertEquals("Bajar la barra al pecho", exercise.getDescription());
        assertEquals("https://video.com/press", exercise.getVideoUrl());
        assertFalse(exercise.isDeleted());
    }

    @Test
    void shouldBuildAGlobalExerciseWithoutOptionals() {
        Exercise exercise = Exercise.builder().name("Sentadilla").muscleGroup(MuscleGroup.QUADRICEPS).build();

        assertTrue(exercise.isGlobal());
        assertEquals(null, exercise.getDescription());
        assertEquals(null, exercise.getVideoUrl());
    }

    @Test
    void builderShouldRejectMissingRequiredFields() {
        assertThrows(NullPointerException.class,
                () -> Exercise.builder().muscleGroup(MuscleGroup.CHEST).build());
        assertThrows(NullPointerException.class, () -> Exercise.builder().name("Press").build());
    }

    @Test
    void shouldMarkDeleted() {
        // Arrange
        Exercise exercise = exercise("Press", MuscleGroup.CHEST, null);
        Instant at = Instant.parse("2026-11-05T10:00:00Z");

        // Act
        exercise.markDeleted(at);

        // Assert
        assertTrue(exercise.isDeleted());
        assertEquals(at, exercise.getDeletedAt());
        assertThrows(NullPointerException.class, () -> exercise.markDeleted(null));
    }

    private static Coach coachWithId() {
        Coach coach = coach("ana@test.com");
        ReflectionTestUtils.setField(coach, "id", UUID.randomUUID());
        return coach;
    }
}
