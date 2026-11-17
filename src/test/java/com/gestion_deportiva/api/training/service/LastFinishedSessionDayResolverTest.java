package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.repository.RoutineDayPosition;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// US-12 · Día que toca (contrato 9.6): el que sigue al del último entrenamiento finalizado, con la vuelta al primero
// y los casos de borde. El repositorio está simulado: qué estados cuentan se prueba en la integración
@ExtendWith(MockitoExtension.class)
class LastFinishedSessionDayResolverTest {

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

    private final Coach ana = coach("ana@test.com");
    private final Routine strength = routine("Fuerza", ana);
    private final RoutineAssignment assignment = assignment(athlete("leo@test.com", ana), strength,
            LocalDate.of(2026, 11, 3));
    private final UUID assignmentId = UUID.randomUUID();

    // Torso (1), Pierna (2) y Movilidad (3)
    private final RoutineDay upper = strength.addDay("Torso");
    private final RoutineDay lower = strength.addDay("Pierna");
    private final RoutineDay mobility = strength.addDay("Movilidad");

    private LastFinishedSessionDayResolver resolver;

    @Test
    void shouldReturnTheFirstDayWhenTheAssignmentHasNoFinishedSession() {
        // Arrange
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId)).thenReturn(Optional.empty());

        // Act + Assert
        assertEquals(upper.getId(), resolve(List.of(upper, lower, mobility)));
    }

    @Test
    void shouldReturnTheDayAfterTheLastFinishedOne() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(finished(upper)));

        assertEquals(lower.getId(), resolve(List.of(upper, lower, mobility)));
    }

    @Test
    void shouldMoveOnToTheNextDayAfterEachFinishedOne() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(finished(lower)));

        assertEquals(mobility.getId(), resolve(List.of(upper, lower, mobility)));
    }

    @Test
    void shouldReturnToTheFirstDayAfterTheLastOne() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(finished(mobility)));

        assertEquals(upper.getId(), resolve(List.of(upper, lower, mobility)));
    }

    @Test
    void shouldReturnTheOnlyDayWhenTheRoutineHasOneDay() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(finished(upper)));

        assertEquals(upper.getId(), resolve(List.of(upper)));
    }

    @Test
    void shouldRotateByDayNumberWhateverTheOrderOfTheList() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(finished(upper)));

        assertEquals(lower.getId(), resolve(List.of(mobility, upper, lower)));
    }

    @Test
    void shouldReturnTheFirstDayWhenTheListIsUnsortedAndThereIsNoFinishedSession() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId)).thenReturn(Optional.empty());

        assertEquals(upper.getId(), resolve(List.of(mobility, lower, upper)));
    }

    @Test
    void shouldReturnTheNextDayByNumberWhenTheDayOfTheLastOneIsGone() {
        // Arrange: el día 2 ya no está en la rutina; sigue el 3
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(position(UUID.randomUUID(), (short) 2)));

        // Act + Assert
        assertEquals(mobility.getId(), resolve(List.of(upper, mobility)));
    }

    @Test
    void shouldReturnTheFirstDayWhenTheDayOfTheLastOneIsGoneAndWasTheLastNumber() {
        // Arrange: el día 3 ya no está y no hay ninguno con número mayor: vuelve al primero
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId))
                .thenReturn(Optional.of(position(UUID.randomUUID(), (short) 3)));

        assertEquals(upper.getId(), resolve(List.of(upper, lower)));
    }

    @Test
    void shouldReturnNullWithoutQueryingWhenTheRoutineHasNoDays() {
        assertNull(resolver.resolve(assignment, List.of()));

        verifyNoInteractions(trainingSessionRepository);
    }

    @Test
    void shouldQueryTheLastFinishedSessionOfTheAssignment() {
        when(trainingSessionRepository.findLastFinishedRoutineDay(assignmentId)).thenReturn(Optional.empty());

        resolve(List.of(upper, lower));

        verify(trainingSessionRepository).findLastFinishedRoutineDay(assignmentId);
    }

    // Asigna ids a la asignación y a los días (las entidades no los generan sin base de datos)
    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(assignment, "id", assignmentId);
        ReflectionTestUtils.setField(upper, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(lower, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(mobility, "id", UUID.randomUUID());
        resolver = new LastFinishedSessionDayResolver(trainingSessionRepository);
    }

    private UUID resolve(List<RoutineDay> days) {
        return resolver.resolve(assignment, days);
    }

    private static RoutineDayPosition finished(RoutineDay day) {
        return position(day.getId(), day.getDayNumber());
    }

    // Proyección sencilla: el repositorio devuelve un RoutineDayPosition con el id del día y su número en la rutina
    private static RoutineDayPosition position(UUID dayId, short dayNumber) {
        return new RoutineDayPosition() {
            @Override
            public UUID getDayId() {
                return dayId;
            }

            @Override
            public short getDayNumber() {
                return dayNumber;
            }
        };
    }
}
