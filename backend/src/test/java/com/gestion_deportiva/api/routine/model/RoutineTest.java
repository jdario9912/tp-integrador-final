package com.gestion_deportiva.api.routine.model;

import com.gestion_deportiva.api.coach.model.Coach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

    private static Coach coachWithId() {
        Coach coach = coach("ana@test.com");
        ReflectionTestUtils.setField(coach, "id", UUID.randomUUID());
        return coach;
    }
}
