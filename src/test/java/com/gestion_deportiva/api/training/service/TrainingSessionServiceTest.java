package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.dto.RoutineExerciseResponse;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineDayRepository;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.exception.EmptyRoutineDayException;
import com.gestion_deportiva.api.training.exception.ExpiredRoutineException;
import com.gestion_deportiva.api.training.exception.NoActiveRoutineException;
import com.gestion_deportiva.api.training.exception.RoutineDayNotInActiveRoutineException;
import com.gestion_deportiva.api.training.exception.TrainingSessionInProgressException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotFoundException;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

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
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.startRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrainingSessionServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);

    // 19:15 del 11/11 en Argentina
    private static final Instant NOV_11_EVENING = Instant.parse("2026-11-11T22:15:00Z");
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);
    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

    @Mock
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Mock
    private RoutineDayRepository routineDayRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private Athlete leo;

    private Routine strength;

    // Torso (press banca), Pierna (sentadilla) y Movilidad (sin ejercicios)
    private RoutineDay upper;

    private RoutineDay lower;

    private RoutineDay mobility;

    // Asignada el 3/11 por 8 semanas: vigente hasta el 28/12 inclusive
    private RoutineAssignment assignment;

    @BeforeEach
    void setUp() {
        Coach ana = withId(coach("ana@test.com"), UUID.randomUUID());
        leo = withId(athlete("leo@test.com", ana), ATHLETE_ID);
        Exercise bench = withId(exercise("Press banca", MuscleGroup.CHEST, ana), UUID.randomUUID());
        Exercise backSquat = withId(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana), UUID.randomUUID());

        strength = withId(routine("Fuerza", ana), UUID.randomUUID());
        strength.setDurationWeeks((short) 8);
        upper = withId(strength.addDay("Torso"), UUID.randomUUID());
        upper.addExercise(withId(routineExercise(bench), UUID.randomUUID()));
        lower = withId(strength.addDay("Pierna"), UUID.randomUUID());
        lower.addExercise(withId(RoutineExercise.builder().exercise(backSquat).sets((short) 5).reps((short) 5).build(),
                UUID.randomUUID()));
        mobility = withId(strength.addDay("Movilidad"), UUID.randomUUID());

        assignment = withId(assignment(leo, strength, NOV_3), UUID.randomUUID());
    }

    // ---------- iniciar ----------

    @Test
    void shouldStartASessionInProgressOnTheChosenDay() {
        // Arrange
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();
        givenSaveAssignsTheId();

        // Act
        TrainingSessionResponse response = service(NOV_11_EVENING)
                .start(ATHLETE_USER, ATHLETE_ID, startRequest(lower.getId()));

        // Assert: lo que se guarda
        TrainingSession saved = captureSaved();
        assertEquals(SessionStatus.IN_PROGRESS, saved.getStatus());
        assertSame(leo, saved.getAthlete());
        assertSame(assignment, saved.getAssignment());
        assertSame(lower, saved.getRoutineDay());
        assertEquals(NOV_11_EVENING, saved.getStartedAt());
        assertEquals(NOV_11, saved.getSessionDate());

        // Assert: la respuesta, con el día y sus ejercicios
        assertEquals(SESSION_ID, response.id());
        assertEquals(SessionStatus.IN_PROGRESS, response.status());
        assertEquals(NOV_11, response.sessionDate());
        assertEquals(NOV_11_EVENING, response.startedAt());
        assertEquals(assignment.getId(), response.assignmentId());
        assertEquals(strength.getId(), response.routineId());
        assertEquals("Fuerza", response.routineName());
        assertEquals(lower.getId(), response.day().id());
        assertEquals((short) 2, response.day().dayNumber());
        assertEquals("Pierna", response.day().name());
        assertEquals(List.of("Sentadilla"),
                response.day().exercises().stream().map(RoutineExerciseResponse::exerciseName).toList());
    }

    @Test
    void shouldFollowTheEvaluationOrderOfTheContract() {
        // Arrange
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();
        givenSaveAssignsTheId();

        // Act
        service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId()));

        // Assert: guard → sesión en progreso → asignación activa → días → alta
        InOrder order = inOrder(athleteAccessGuard, trainingSessionRepository, routineAssignmentRepository,
                routineDayRepository);
        order.verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        order.verify(trainingSessionRepository).existsByAthleteIdAndStatus(ATHLETE_ID, SessionStatus.IN_PROGRESS);
        order.verify(routineAssignmentRepository).findByAthleteIdAndActiveTrue(ATHLETE_ID);
        order.verify(routineDayRepository).findWithExercisesByRoutineId(strength.getId());
        order.verify(trainingSessionRepository).saveAndFlush(any(TrainingSession.class));
    }

    @Test
    void shouldPropagateTheNotFoundOfTheGuardWithoutQueryingAnythingElse() {
        doThrow(new AthleteNotFoundException(ATHLETE_ID))
                .when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        assertThrows(AthleteNotFoundException.class,
                () -> service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId())));
        verifyNoInteractions(trainingSessionRepository, routineAssignmentRepository, routineDayRepository);
    }

    @Test
    void shouldPropagateTheAccessDeniedOfTheGuardWithoutQueryingAnythingElse() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId())));
        verifyNoInteractions(trainingSessionRepository, routineAssignmentRepository, routineDayRepository);
    }

    // El 409 va antes que los 422: no se mira la rutina, así que responde 409 aunque esté vencida o el día ya no sea
    // de la rutina activa (lo útil es retomar la sesión abierta)
    @Test
    void shouldReturn409WhenThereIsASessionInProgressBeforeLookingAtTheRoutine() {
        // Arrange
        when(trainingSessionRepository.existsByAthleteIdAndStatus(ATHLETE_ID, SessionStatus.IN_PROGRESS))
                .thenReturn(true);

        // Act
        TrainingSessionInProgressException ex = assertThrows(TrainingSessionInProgressException.class,
                () -> service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(UUID.randomUUID())));

        // Assert
        assertEquals("Ya tenés un entrenamiento en curso. Retomalo para continuar", ex.getMessage());
        verifyNoInteractions(routineAssignmentRepository, routineDayRepository);
        verify(trainingSessionRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldReturn422WithoutAnActiveRoutine() {
        // Arrange
        givenNoSessionInProgress();
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.empty());

        // Act
        NoActiveRoutineException ex = assertThrows(NoActiveRoutineException.class,
                () -> service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId())));

        // Assert
        assertEquals("No tenés una rutina activa para iniciar un entrenamiento", ex.getMessage());
        verifyNoInteractions(routineDayRepository);
        verify(trainingSessionRepository, never()).saveAndFlush(any());
    }

    // Asignada el 3/11 por 1 semana: el 9/11 es el último día vigente. A las 02:59:59 UTC del 10/11 todavía es el 9/11
    // en Argentina (23:59:59): se puede entrenar y la sesión queda con fecha 9/11
    @Test
    void shouldStillStartOnTheLastValidDayUntilMidnightInTheAppTimeZone() {
        // Arrange
        strength.setDurationWeeks((short) 1);
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();
        givenSaveAssignsTheId();
        Instant lastMinute = Instant.parse("2026-11-10T02:59:59Z");

        // Act
        TrainingSessionResponse response = service(lastMinute).start(ATHLETE_USER, ATHLETE_ID,
                startRequest(upper.getId()));

        // Assert
        assertEquals(LocalDate.of(2026, 11, 9), response.sessionDate());
        assertEquals(lastMinute, response.startedAt());
    }

    @Test
    void shouldReturn422FromTheDayAfterTheLastValidDayInTheAppTimeZone() {
        // Arrange: a las 03:00 UTC del 10/11 ya es el 10/11 en Argentina
        strength.setDurationWeeks((short) 1);
        givenNoSessionInProgress();
        givenTheActiveAssignment();

        // Act
        ExpiredRoutineException ex = assertThrows(ExpiredRoutineException.class,
                () -> service(Instant.parse("2026-11-10T03:00:00Z"))
                        .start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId())));

        // Assert: el mensaje nombra el último día vigente
        assertEquals("Tu rutina venció el 09/11/2026. Pedile a tu entrenador una nueva", ex.getMessage());
        verifyNoInteractions(routineDayRepository);
        verify(trainingSessionRepository, never()).saveAndFlush(any());
    }

    // El reloj es UTC: a las 01:30 UTC del 12/11 en Argentina todavía es el 11/11 (22:30)
    @Test
    void shouldTakeTheSessionDateInTheAppTimeZoneFromTheSameInstant() {
        // Arrange
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();
        givenSaveAssignsTheId();
        Instant lateNight = Instant.parse("2026-11-12T01:30:00Z");

        // Act
        service(lateNight).start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId()));

        // Assert
        TrainingSession saved = captureSaved();
        assertEquals(lateNight, saved.getStartedAt());
        assertEquals(NOV_11, saved.getSessionDate());
    }

    @Test
    void shouldNeverExpireWithoutDuration() {
        // Arrange
        strength.setDurationWeeks(null);
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();
        givenSaveAssignsTheId();

        // Act
        TrainingSessionResponse response = service(Instant.parse("2030-01-01T15:00:00Z"))
                .start(ATHLETE_USER, ATHLETE_ID, startRequest(upper.getId()));

        // Assert
        assertEquals(LocalDate.of(2030, 1, 1), response.sessionDate());
    }

    // Un id inexistente, de otra rutina o de una asignación anterior: no está entre los días de la rutina activa
    @Test
    void shouldReturn422WhenTheDayIsNotOfTheActiveRoutine() {
        // Arrange
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();

        // Act
        RoutineDayNotInActiveRoutineException ex = assertThrows(RoutineDayNotInActiveRoutineException.class,
                () -> service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(UUID.randomUUID())));

        // Assert
        assertEquals("El día elegido no pertenece a tu rutina activa", ex.getMessage());
        verify(trainingSessionRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldReturn422WhenTheDayHasNoExercises() {
        // Arrange: el entrenador vació Movilidad después de asignar la rutina
        givenNoSessionInProgress();
        givenTheActiveAssignment();
        givenTheDaysOfTheRoutine();

        // Act
        EmptyRoutineDayException ex = assertThrows(EmptyRoutineDayException.class,
                () -> service(NOV_11_EVENING).start(ATHLETE_USER, ATHLETE_ID, startRequest(mobility.getId())));

        // Assert
        assertEquals("El día elegido no tiene ejercicios cargados", ex.getMessage());
        verify(trainingSessionRepository, never()).saveAndFlush(any());
    }

    // ---------- sesión en progreso ----------

    @Test
    void shouldReturnTheSessionInProgressAfterCheckingTheAccess() {
        // Arrange
        TrainingSession inProgress = withId(session(assignment, upper, NOV_11), SESSION_ID);
        when(trainingSessionRepository.findDetailByAthleteIdAndStatus(ATHLETE_ID, SessionStatus.IN_PROGRESS))
                .thenReturn(Optional.of(inProgress));

        // Act
        TrainingSessionResponse response = service(NOV_11_EVENING).findInProgress(COACH_USER, ATHLETE_ID)
                .orElseThrow();

        // Assert
        assertEquals(SESSION_ID, response.id());
        assertEquals(upper.getId(), response.day().id());
        InOrder order = inOrder(athleteAccessGuard, trainingSessionRepository);
        order.verify(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);
        order.verify(trainingSessionRepository).findDetailByAthleteIdAndStatus(ATHLETE_ID, SessionStatus.IN_PROGRESS);
    }

    @Test
    void shouldReturnEmptyWithoutASessionInProgress() {
        when(trainingSessionRepository.findDetailByAthleteIdAndStatus(ATHLETE_ID, SessionStatus.IN_PROGRESS))
                .thenReturn(Optional.empty());

        assertTrue(service(NOV_11_EVENING).findInProgress(ATHLETE_USER, ATHLETE_ID).isEmpty());
    }

    @Test
    void shouldNotRevealWhetherThereIsASessionInProgressWithoutAccess() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service(NOV_11_EVENING).findInProgress(COACH_USER, ATHLETE_ID));
        verifyNoInteractions(trainingSessionRepository);
    }

    // ---------- detalle ----------

    @Test
    void shouldReturnTheSessionOfTheAthlete() {
        // Arrange
        TrainingSession stored = withId(session(assignment, lower, NOV_11), SESSION_ID);
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.of(stored));

        // Act
        TrainingSessionResponse response = service(NOV_11_EVENING).findById(ATHLETE_USER, ATHLETE_ID, SESSION_ID);

        // Assert
        assertEquals(SESSION_ID, response.id());
        assertEquals("Pierna", response.day().name());
        verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
    }

    // Inexistente o de otro atleta: la consulta filtra por los dos ids y la respuesta es la misma
    @Test
    void shouldReturn404WhenTheSessionIsNotOfTheAthlete() {
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.empty());

        TrainingSessionNotFoundException ex = assertThrows(TrainingSessionNotFoundException.class,
                () -> service(NOV_11_EVENING).findById(ATHLETE_USER, ATHLETE_ID, SESSION_ID));

        assertEquals("No existe la sesión de entrenamiento con id " + SESSION_ID, ex.getMessage());
    }

    @Test
    void shouldCheckTheAccessBeforeLookingForTheSession() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service(NOV_11_EVENING).findById(COACH_USER, ATHLETE_ID, SESSION_ID));
        verifyNoInteractions(trainingSessionRepository);
    }

    // ---------- helpers ----------

    private TrainingSessionService service(Instant now) {
        AppClock appClock = new AppClock(Clock.fixed(now, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        return new TrainingSessionService(trainingSessionRepository, routineAssignmentRepository, routineDayRepository,
                athleteAccessGuard, appClock);
    }

    private void givenNoSessionInProgress() {
        when(trainingSessionRepository.existsByAthleteIdAndStatus(ATHLETE_ID, SessionStatus.IN_PROGRESS))
                .thenReturn(false);
    }

    private void givenTheActiveAssignment() {
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.of(assignment));
    }

    private void givenTheDaysOfTheRoutine() {
        when(routineDayRepository.findWithExercisesByRoutineId(strength.getId()))
                .thenReturn(List.of(upper, lower, mobility));
    }

    // Como la base: el alta le asigna el id
    private void givenSaveAssignsTheId() {
        when(trainingSessionRepository.saveAndFlush(any(TrainingSession.class)))
                .thenAnswer(invocation -> withId(invocation.<TrainingSession>getArgument(0), SESSION_ID));
    }

    private TrainingSession captureSaved() {
        ArgumentCaptor<TrainingSession> captor = ArgumentCaptor.forClass(TrainingSession.class);
        verify(trainingSessionRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static <T> T withId(T entity, UUID id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
