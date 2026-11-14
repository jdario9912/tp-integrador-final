package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.training.dto.PerformedSetRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.exception.RoutineExerciseNotInSessionDayException;
import com.gestion_deportiva.api.training.exception.SetNumberOutOfRangeException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotFoundException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotInProgressException;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Registro de series (US-19, contrato 11.6). El orden de evaluación es parte del contrato: se prueba con InOrder
@ExtendWith(MockitoExtension.class)
class PerformedSetServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);
    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

    @Mock
    private PerformedSetRepository performedSetRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private UUID pressId;

    private UUID squatId;

    private RoutineExercise press;

    private RoutineExercise squat;

    private TrainingSession inProgress;

    @BeforeEach
    void setUp() {
        Coach ana = coach("ana@test.com");
        Athlete leo = withId(athlete("leo@test.com", ana), ATHLETE_ID);
        Exercise bench = exercise("Press banca", MuscleGroup.CHEST, ana);
        Exercise backSquat = exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana);

        Routine strength = routine("Fuerza", ana);
        RoutineDay upper = strength.addDay("Torso");
        press = withId(routineExercise(bench), UUID.randomUUID()); // 4 series
        upper.addExercise(press);
        RoutineDay lower = strength.addDay("Pierna");
        squat = withId(routineExercise(backSquat), UUID.randomUUID());
        lower.addExercise(squat);
        pressId = press.getId();
        squatId = squat.getId();

        RoutineAssignment assignment = assignment(leo, strength, NOV_3);
        inProgress = withId(session(assignment, upper, NOV_11), SESSION_ID);
    }

    // ---------- alta y reemplazo ----------

    @Test
    void shouldCheckAccessThenLockTheSessionAndCreateTheSetAsDone() {
        when(trainingSessionRepository.findByIdAndAthleteIdForUpdate(SESSION_ID, ATHLETE_ID))
                .thenReturn(Optional.of(inProgress));

        service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 1, done("62.5", 8, 7));

        InOrder order = inOrder(athleteAccessGuard, trainingSessionRepository, performedSetRepository);
        order.verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        order.verify(trainingSessionRepository).findByIdAndAthleteIdForUpdate(SESSION_ID, ATHLETE_ID);
        ArgumentCaptor<PerformedSet> saved = ArgumentCaptor.forClass(PerformedSet.class);
        order.verify(performedSetRepository).saveAndFlush(saved.capture());
        PerformedSet set = saved.getValue();
        assertEquals(SetStatus.DONE, set.getStatus());
        assertEquals("62.50", set.getWeightKg().toPlainString());
        assertEquals((short) 8, set.getReps());
        assertEquals((short) 7, set.getRpe());
        assertEquals((short) 1, set.getSetNumber());
        assertSame(press, set.getRoutineExercise());
        assertSame(inProgress, set.getTrainingSession());
    }

    @Test
    void shouldReplaceTheSetWhenTheSameKeyIsRegisteredAgain() {
        PerformedSet existing = new PerformedSet(inProgress, press, (short) 1);
        existing.markDone(new BigDecimal("60"), 6, null);
        givenTheSession();
        when(performedSetRepository.findByTrainingSessionIdAndRoutineExerciseIdAndSetNumber(SESSION_ID, pressId,
                (short) 1)).thenReturn(Optional.of(existing));
        when(performedSetRepository.findBySessionInOrder(SESSION_ID)).thenReturn(List.of(existing));

        TrainingSessionResponse response = service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 1,
                done("62.5", 8, 7));

        // Reemplaza la misma fila (no crea otra) y la respuesta trae la serie ya corregida
        ArgumentCaptor<PerformedSet> saved = ArgumentCaptor.forClass(PerformedSet.class);
        verify(performedSetRepository).saveAndFlush(saved.capture());
        assertSame(existing, saved.getValue());
        assertEquals((short) 8, existing.getReps());
        assertEquals(1, response.performedSets().size());
        assertEquals(pressId, response.performedSets().get(0).routineExerciseId());
    }

    @Test
    void shouldSkipWithTheReasonAndDiscardTheValues() {
        givenTheSession();

        service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 2,
                new PerformedSetRequest(SetStatus.SKIPPED, null, null, null, "  Dolor de rodilla "));

        ArgumentCaptor<PerformedSet> saved = ArgumentCaptor.forClass(PerformedSet.class);
        verify(performedSetRepository).saveAndFlush(saved.capture());
        assertEquals(SetStatus.SKIPPED, saved.getValue().getStatus());
        assertEquals((short) 2, saved.getValue().getSetNumber());
        assertEquals("Dolor de rodilla", saved.getValue().getSkipReason());
        assertNull(saved.getValue().getWeightKg());
        assertNull(saved.getValue().getReps());
    }

    @Test
    void shouldReturnTheWholeSessionWithItsPerformedSets() {
        givenTheSession();
        when(performedSetRepository.findBySessionInOrder(SESSION_ID)).thenReturn(List.of());

        TrainingSessionResponse response = service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 1,
                done("60", 10, null));

        assertEquals(SESSION_ID, response.id());
        assertEquals("Torso", response.day().name());
        verify(performedSetRepository).findBySessionInOrder(SESSION_ID);
    }

    // ---------- reglas, en el orden del contrato ----------

    @Test
    void shouldRejectAnAthleteThatIsNotTheCallerBeforeLockingTheSession() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service().record(COACH_USER, ATHLETE_ID, SESSION_ID, pressId, 1, done("60", 10, null)));

        verifyNoInteractions(trainingSessionRepository, performedSetRepository);
    }

    @Test
    void shouldAnswerNotFoundWhenTheSessionIsMissingOrOfAnotherAthlete() {
        when(trainingSessionRepository.findByIdAndAthleteIdForUpdate(SESSION_ID, ATHLETE_ID))
                .thenReturn(Optional.empty());

        assertThrows(TrainingSessionNotFoundException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 1, done("60", 10, null)));

        verifyNoInteractions(performedSetRepository);
    }

    @Test
    void shouldAnswerConflictForASessionThatIsNotInProgressBeforeCheckingTheExercises() {
        ReflectionTestUtils.setField(inProgress, "status", SessionStatus.FINISHED);
        givenTheSession();

        // Un ejercicio que no es del día: con la sesión cerrada, lo que corresponde es el 409
        assertThrows(TrainingSessionNotInProgressException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, squatId, 1, done("60", 10, null)));
        assertThrows(TrainingSessionNotInProgressException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 1, done("60", 10, null)));

        verify(performedSetRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldRejectAnExerciseThatIsNotOfTheSessionDayWith422() {
        givenTheSession();

        // Ejercicio de otro día de la misma rutina, y uno que no existe: el mismo error
        assertThrows(RoutineExerciseNotInSessionDayException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, squatId, 1, done("60", 10, null)));
        assertThrows(RoutineExerciseNotInSessionDayException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, UUID.randomUUID(), 1,
                        done("60", 10, null)));

        verify(performedSetRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldRejectASetOutsideThePrescribedSetsWith422() {
        givenTheSession();

        SetNumberOutOfRangeException zero = assertThrows(SetNumberOutOfRangeException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 0, done("60", 10, null)));
        SetNumberOutOfRangeException fifth = assertThrows(SetNumberOutOfRangeException.class,
                () -> service().record(ATHLETE_USER, ATHLETE_ID, SESSION_ID, pressId, 5, done("60", 10, null)));

        assertEquals("El ejercicio tiene 4 series: la serie 0 no existe", zero.getMessage());
        assertEquals("El ejercicio tiene 4 series: la serie 5 no existe", fifth.getMessage());
        verify(performedSetRepository, never()).saveAndFlush(any());
    }

    // ---------- helpers ----------

    private PerformedSetService service() {
        return new PerformedSetService(trainingSessionRepository, performedSetRepository, athleteAccessGuard);
    }

    private void givenTheSession() {
        when(trainingSessionRepository.findByIdAndAthleteIdForUpdate(SESSION_ID, ATHLETE_ID))
                .thenReturn(Optional.of(inProgress));
    }

    private static PerformedSetRequest done(String weight, Integer reps, Integer rpe) {
        return new PerformedSetRequest(SetStatus.DONE, new BigDecimal(weight), reps, rpe, null);
    }

    private static <T> T withId(T entity, UUID id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
