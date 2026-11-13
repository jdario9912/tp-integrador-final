package com.gestion_deportiva.api.assignment.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
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

    // ---------- vigencia (US-17, contrato 9.5) ----------

    // Último día vigente = asignación + 7 × semanas − 1: ese día todavía es vigente y el siguiente ya está vencida.
    // Sin duración (columna vacía = null) no vence
    @ParameterizedTest(name = "asignada {0} por {1} semanas, hoy {2} → vence {3}, vencida {4}")
    @CsvSource({
            "2026-11-03, 8,  2026-11-03, 2026-12-28, false",
            "2026-11-03, 8,  2026-12-28, 2026-12-28, false",
            "2026-11-03, 8,  2026-12-29, 2026-12-28, true",
            "2026-11-03, 1,  2026-11-09, 2026-11-09, false",
            "2026-11-03, 1,  2026-11-10, 2026-11-09, true",
            "2026-11-03, 52, 2027-11-01, 2027-11-01, false",
            "2026-11-03,   , 2030-01-01,           , false"
    })
    void shouldComputeTheEndDateAndWhetherItIsExpired(LocalDate assignmentDate, Short durationWeeks,
                                                      LocalDate today, LocalDate expectedEndDate,
                                                      boolean expectedExpired) {
        // Arrange
        strength.setDurationWeeks(durationWeeks);
        RoutineAssignment assignment = assignment(leo, strength, assignmentDate);

        // Act + Assert
        assertEquals(expectedEndDate, assignment.endDate());
        assertEquals(expectedExpired, assignment.isExpiredOn(today));
    }

    @Test
    void shouldFollowTheCurrentDurationOfTheRoutine() {
        // Arrange: asignada por 8 semanas
        strength.setDurationWeeks((short) 8);
        RoutineAssignment assignment = assignment(leo, strength, LocalDate.of(2026, 11, 3));

        // Act: el entrenador la acorta a 1 semana y después le quita la duración
        strength.setDurationWeeks((short) 1);
        LocalDate shortened = assignment.endDate();
        strength.setDurationWeeks(null);

        // Assert
        assertEquals(LocalDate.of(2026, 11, 9), shortened);
        assertNull(assignment.endDate());
        assertFalse(assignment.isExpiredOn(LocalDate.of(2030, 1, 1)));
    }

    @Test
    void shouldRejectAMissingToday() {
        RoutineAssignment assignment = assignment(leo, strength, NOV_10);

        assertThrows(NullPointerException.class, () -> assignment.isExpiredOn(null));
    }
}
