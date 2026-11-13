package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.dto.AthleteRoutineResponse;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.dto.RoutineDayResponse;
import com.gestion_deportiva.api.routine.dto.RoutineExerciseResponse;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineDayRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AthleteRoutineServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);

    private static final Instant NOV_10_NOON = Instant.parse("2026-11-10T15:00:00Z");
    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    @Mock
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Mock
    private RoutineDayRepository routineDayRepository;

    @Mock
    private NextRoutineDayResolver nextRoutineDayResolver;

    private Routine strength;

    private RoutineDay upper;

    private RoutineDay lower;

    private RoutineExercise benchPress;

    private RoutineExercise squat;

    // Asignada el 3/11 por 8 semanas: vigente hasta el 28/12 inclusive
    private RoutineAssignment assignment;

    @BeforeEach
    void setUp() {
        Coach ana = withId(coach("ana@test.com"), UUID.randomUUID());
        Athlete leo = withId(athlete("leo@test.com", ana), ATHLETE_ID);
        Exercise bench = withId(exercise("Press banca", MuscleGroup.CHEST, ana), UUID.randomUUID());
        Exercise backSquat = withId(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana), UUID.randomUUID());

        strength = withId(routine("Fuerza", ana), UUID.randomUUID());
        strength.setDescription("Bloque de 8 semanas");
        strength.setGoal("Fuerza");
        strength.setDaysPerWeek((short) 2);
        strength.setDurationWeeks((short) 8);
        upper = withId(strength.addDay("Torso"), UUID.randomUUID());
        benchPress = withId(routineExercise(bench), UUID.randomUUID());
        upper.addExercise(benchPress);
        lower = withId(strength.addDay("Pierna"), UUID.randomUUID());
        squat = withId(RoutineExercise.builder().exercise(backSquat).sets((short) 5).reps((short) 5).build(),
                UUID.randomUUID());
        lower.addExercise(squat);

        assignment = withId(assignment(leo, strength, NOV_3), UUID.randomUUID());
    }

    @Test
    void shouldReturnTheActiveRoutineWithItsStructureValidityAndNextDay() {
        // Arrange
        List<RoutineDay> days = List.of(upper, lower);
        givenTheActiveAssignment();
        when(routineDayRepository.findWithExercisesByRoutineId(strength.getId())).thenReturn(days);
        when(nextRoutineDayResolver.resolve(assignment, days)).thenReturn(upper.getId());

        // Act
        AthleteRoutineResponse response = service(NOV_10_NOON).findActive(ATHLETE_USER, ATHLETE_ID).orElseThrow();

        // Assert: asignación, vigencia y día que toca
        assertEquals(assignment.getId(), response.assignmentId());
        assertEquals(NOV_3, response.assignmentDate());
        assertEquals(LocalDate.of(2026, 12, 28), response.endDate());
        assertFalse(response.expired());
        assertEquals(upper.getId(), response.nextDayId());

        // Assert: rutina
        assertEquals(strength.getId(), response.routine().id());
        assertEquals("Fuerza", response.routine().name());
        assertEquals("Bloque de 8 semanas", response.routine().description());
        assertEquals("Fuerza", response.routine().goal());
        assertEquals(Short.valueOf((short) 2), response.routine().daysPerWeek());
        assertEquals(Short.valueOf((short) 8), response.routine().durationWeeks());

        // Assert: días y ejercicios, en el orden en que llegan del repositorio
        List<RoutineDayResponse> responseDays = response.routine().days();
        assertEquals(List.of(upper.getId(), lower.getId()), responseDays.stream().map(RoutineDayResponse::id).toList());
        assertEquals(List.of((short) 1, (short) 2),
                responseDays.stream().map(RoutineDayResponse::dayNumber).toList());
        RoutineExerciseResponse first = responseDays.get(0).exercises().get(0);
        assertEquals(benchPress.getId(), first.id());
        assertEquals("Press banca", first.exerciseName());
        assertEquals(MuscleGroup.CHEST, first.muscleGroup());
        assertEquals((short) 4, first.sets());
        assertEquals((short) 10, first.reps());
        assertEquals(0, new BigDecimal("60.50").compareTo(first.recommendedWeight()));
        assertEquals(Short.valueOf((short) 90), first.rest());
        assertEquals("RIR 2", first.rirRpe());
        assertEquals("Bajar en 3 segundos", first.techniqueNote());
        RoutineExerciseResponse onlyRequired = responseDays.get(1).exercises().get(0);
        assertEquals(squat.getId(), onlyRequired.id());
        assertNull(onlyRequired.recommendedWeight());
        assertNull(onlyRequired.rest());
        assertNull(onlyRequired.rirRpe());
        assertNull(onlyRequired.techniqueNote());
    }

    @Test
    void shouldCheckTheAccessBeforeLookingForTheRoutine() {
        // Arrange
        givenTheActiveAssignment();
        when(routineDayRepository.findWithExercisesByRoutineId(strength.getId())).thenReturn(List.of(upper, lower));

        // Act
        service(NOV_10_NOON).findActive(ATHLETE_USER, ATHLETE_ID);

        // Assert
        InOrder order = inOrder(athleteAccessGuard, routineAssignmentRepository, routineDayRepository);
        order.verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        order.verify(routineAssignmentRepository).findByAthleteIdAndActiveTrue(ATHLETE_ID);
        order.verify(routineDayRepository).findWithExercisesByRoutineId(strength.getId());
    }

    @Test
    void shouldPropagateTheNotFoundOfTheGuardWithoutLookingForTheRoutine() {
        // Arrange
        doThrow(new AthleteNotFoundException(ATHLETE_ID))
                .when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        // Act + Assert
        assertThrows(AthleteNotFoundException.class,
                () -> service(NOV_10_NOON).findActive(ATHLETE_USER, ATHLETE_ID));
        verifyNoInteractions(routineAssignmentRepository, routineDayRepository, nextRoutineDayResolver);
    }

    @Test
    void shouldPropagateTheAccessDeniedOfTheGuardWithoutRevealingWhetherThereIsARoutine() {
        // Arrange
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        // Act + Assert
        assertThrows(AthleteAccessDeniedException.class,
                () -> service(NOV_10_NOON).findActive(ATHLETE_USER, ATHLETE_ID));
        verifyNoInteractions(routineAssignmentRepository, routineDayRepository, nextRoutineDayResolver);
    }

    @Test
    void shouldReturnEmptyWhenTheAthleteHasNoActiveRoutine() {
        // Arrange
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.empty());

        // Act
        Optional<AthleteRoutineResponse> response = service(NOV_10_NOON).findActive(ATHLETE_USER, ATHLETE_ID);

        // Assert
        assertTrue(response.isEmpty());
        verifyNoInteractions(routineDayRepository, nextRoutineDayResolver);
    }

    // El reloj es UTC y "hoy" se calcula en Argentina (UTC-3): el 29/12 a las 02:30 UTC todavía es el 28/12, el
    // último día vigente; comparando en UTC ya estaría vencida
    @ParameterizedTest(name = "a las {0} vencida = {1}")
    @CsvSource({
            "2026-12-29T02:30:00Z, false",
            "2026-12-29T03:00:00Z, true"
    })
    void shouldEvaluateTheExpirationInTheAppTimeZone(Instant now, boolean expectedExpired) {
        // Arrange
        givenTheActiveAssignment();
        when(routineDayRepository.findWithExercisesByRoutineId(strength.getId())).thenReturn(List.of(upper, lower));

        // Act
        AthleteRoutineResponse response = service(now).findActive(ATHLETE_USER, ATHLETE_ID).orElseThrow();

        // Assert
        assertEquals(LocalDate.of(2026, 12, 28), response.endDate());
        assertEquals(expectedExpired, response.expired());
    }

    @Test
    void shouldNeverExpireWithoutDuration() {
        // Arrange
        strength.setDurationWeeks(null);
        givenTheActiveAssignment();
        when(routineDayRepository.findWithExercisesByRoutineId(strength.getId())).thenReturn(List.of(upper, lower));

        // Act
        AthleteRoutineResponse response = service(Instant.parse("2030-01-01T15:00:00Z"))
                .findActive(ATHLETE_USER, ATHLETE_ID).orElseThrow();

        // Assert
        assertNull(response.endDate());
        assertFalse(response.expired());
        assertNull(response.routine().durationWeeks());
    }

    @Test
    void shouldReturnAnEmptyStructureWhenTheRoutineHasNoDays() {
        // Arrange: el entrenador la vació después de asignarla
        givenTheActiveAssignment();
        when(routineDayRepository.findWithExercisesByRoutineId(strength.getId())).thenReturn(List.of());

        // Act
        AthleteRoutineResponse response = service(NOV_10_NOON).findActive(ATHLETE_USER, ATHLETE_ID).orElseThrow();

        // Assert: el resolver devuelve null (mock sin stub) y la respuesta lo respeta
        assertTrue(response.routine().days().isEmpty());
        assertNull(response.nextDayId());
    }

    private AthleteRoutineService service(Instant now) {
        return new AthleteRoutineService(athleteAccessGuard, routineAssignmentRepository, routineDayRepository,
                nextRoutineDayResolver, Clock.fixed(now, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
    }

    private void givenTheActiveAssignment() {
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.of(assignment));
    }

    private static <T> T withId(T entity, UUID id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
