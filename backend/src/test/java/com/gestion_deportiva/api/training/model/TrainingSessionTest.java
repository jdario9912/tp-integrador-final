package com.gestion_deportiva.api.training.model;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrainingSessionTest {

    // 22:30 del 11/11 en Argentina: en UTC ya es el 12
    private static final Instant STARTED_AT = Instant.parse("2026-11-12T01:30:00Z");
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    private final Coach ana = coach("ana@test.com");
    private final Athlete leo = athlete("leo@test.com", ana);
    private final Routine strength = routine("Fuerza", ana);
    private final RoutineDay upper = strength.addDay("Torso");
    private final RoutineAssignment active = assignment(leo, strength, LocalDate.of(2026, 11, 3));

    @Test
    void shouldStartInProgressWithTheAthleteOfTheAssignment() {
        // Act
        TrainingSession session = TrainingSession.start(active, upper, STARTED_AT, NOV_11);

        // Assert
        assertNull(session.getId());
        assertEquals(SessionStatus.IN_PROGRESS, session.getStatus());
        assertTrue(session.isInProgress());
        assertSame(leo, session.getAthlete());
        assertSame(active, session.getAssignment());
        assertSame(upper, session.getRoutineDay());
        assertEquals(STARTED_AT, session.getStartedAt());
        assertEquals(NOV_11, session.getSessionDate());
    }

    @Test
    void shouldAcceptAnyDayOfTheAssignedRoutine() {
        RoutineDay lower = strength.addDay("Pierna");

        assertSame(lower, TrainingSession.start(active, lower, STARTED_AT, NOV_11).getRoutineDay());
    }

    @Test
    void shouldRejectADayOfAnotherRoutine() {
        // Arrange
        RoutineDay foreignDay = routine("Otra", ana).addDay("Torso");

        // Act + Assert: el service ya respondió 422 antes; llegar acá es un error de programación
        assertThrows(IllegalArgumentException.class,
                () -> TrainingSession.start(active, foreignDay, STARTED_AT, NOV_11));
    }

    @Test
    void shouldRejectMissingData() {
        assertThrows(NullPointerException.class, () -> TrainingSession.start(null, upper, STARTED_AT, NOV_11));
        assertThrows(NullPointerException.class, () -> TrainingSession.start(active, null, STARTED_AT, NOV_11));
        assertThrows(NullPointerException.class, () -> TrainingSession.start(active, upper, null, NOV_11));
        assertThrows(NullPointerException.class, () -> TrainingSession.start(active, upper, STARTED_AT, null));
    }

    @Test
    void shouldBeEqualOnlyWithTheSameId() {
        // Arrange
        TrainingSession first = TrainingSession.start(active, upper, STARTED_AT, NOV_11);
        TrainingSession second = TrainingSession.start(active, upper, STARTED_AT, NOV_11);

        // Act + Assert: sin id (todavía no se guardaron) no son iguales
        assertNotEquals(first, second);
        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(first, "id", id);
        ReflectionTestUtils.setField(second, "id", id);
        assertEquals(first, second);
        assertEquals(first.hashCode(), second.hashCode());
    }
}
