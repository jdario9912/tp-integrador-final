package com.gestion_deportiva.api.assignment.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineAssignmentTest {

    private static final LocalDate NOV_10 = LocalDate.of(2026, 11, 10);

    private final Coach ana = coach("ana@test.com");
    private final Athlete leo = athlete("leo@test.com", ana);
    private final Routine strength = routine("Fuerza", ana);

    @Test
    void shouldBeActiveWhenCreated() {
        // Act
        RoutineAssignment assignment = assignment(leo, strength, NOV_10);

        // Assert
        assertTrue(assignment.isActive());
        assertSame(leo, assignment.getAthlete());
        assertSame(strength, assignment.getRoutine());
        assertEquals(NOV_10, assignment.getAssignmentDate());
    }

    @Test
    void shouldBeInactiveAfterDeactivate() {
        RoutineAssignment assignment = assignment(leo, strength, NOV_10);

        assignment.deactivate();

        assertFalse(assignment.isActive());
    }

    @Test
    void shouldRejectMissingAthleteRoutineOrDate() {
        assertThrows(NullPointerException.class, () -> assignment(null, strength, NOV_10));
        assertThrows(NullPointerException.class, () -> assignment(leo, null, NOV_10));
        assertThrows(NullPointerException.class, () -> assignment(leo, strength, null));
    }
}
