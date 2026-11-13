package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

// Día que toca mientras no existen los entrenamientos (US-17): siempre el primero de la rutina
class FirstRoutineDayResolverTest {

    private final FirstRoutineDayResolver resolver = new FirstRoutineDayResolver();

    private final Coach ana = coach("ana@test.com");
    private final Routine strength = routine("Fuerza", ana);
    private final RoutineAssignment assignment = assignment(athlete("leo@test.com", ana), strength,
            LocalDate.of(2026, 11, 3));

    @Test
    void shouldReturnTheFirstDayOfTheRoutine() {
        // Arrange
        RoutineDay upper = withId(strength.addDay("Torso"));
        RoutineDay lower = withId(strength.addDay("Pierna"));

        // Act
        UUID nextDayId = resolver.resolve(assignment, List.of(upper, lower));

        // Assert
        assertEquals(upper.getId(), nextDayId);
    }

    @Test
    void shouldReturnTheDayWithTheLowestNumberWhateverTheOrderOfTheList() {
        RoutineDay upper = withId(strength.addDay("Torso"));
        RoutineDay lower = withId(strength.addDay("Pierna"));

        assertEquals(upper.getId(), resolver.resolve(assignment, List.of(lower, upper)));
    }

    @Test
    void shouldReturnNullWhenTheRoutineHasNoDays() {
        assertNull(resolver.resolve(assignment, List.of()));
    }

    private static RoutineDay withId(RoutineDay day) {
        ReflectionTestUtils.setField(day, "id", UUID.randomUUID());
        return day;
    }
}
