package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.dto.ReviewTrainingSessionRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotFoundException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotReviewableException;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Revisión del entrenador (US-21, contrato 15.4 y 15.6): pertenencia antes que la búsqueda, 404 de la sesión ajena, 422
// si no está finalizada y la revisión con la hora del reloj. Mockito: el repositorio y el guard son mocks
@ExtendWith(MockitoExtension.class)
class TrainingSessionReviewServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
    // Con nanosegundos: la revisión se guarda a microsegundos
    private static final Instant NOW = Instant.parse("2026-11-12T12:00:00.654321987Z");
    private static final Instant ENDED_AT = Instant.parse("2026-11-11T23:00:00Z");
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

    @Mock
    private PerformedSetRepository performedSetRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private TrainingSessionReviewService service;

    private RoutineAssignment assignment;

    private RoutineDay upper;

    @BeforeEach
    void setUp() {
        AppClock appClock = new AppClock(Clock.fixed(NOW, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        service = new TrainingSessionReviewService(trainingSessionRepository, performedSetRepository,
                athleteAccessGuard, appClock);

        Coach ana = coach("ana@test.com");
        Exercise bench = exercise("Press banca", MuscleGroup.CHEST, ana);
        Routine strength = routine("Fuerza", ana);
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        assignment = assignment(athlete("leo@test.com", ana), strength, LocalDate.of(2026, 11, 3));
    }

    @Test
    void shouldVerifyTheAccessBeforeLookingUpTheSession() {
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.of(finishedSession()));

        service.review(COACH_USER, ATHLETE_ID, SESSION_ID, new ReviewTrainingSessionRequest("Bien"));

        InOrder order = inOrder(athleteAccessGuard, trainingSessionRepository);
        order.verify(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);
        order.verify(trainingSessionRepository).findDetail(ATHLETE_ID, SESSION_ID);
    }

    @Test
    void shouldReviewTheFinishedSessionAndReturnItWithTheObservation() {
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.of(finishedSession()));

        TrainingSessionResponse response = service.review(COACH_USER, ATHLETE_ID, SESSION_ID,
                new ReviewTrainingSessionRequest("Buen trabajo"));

        assertEquals(SessionStatus.FINISHED, response.status());
        assertEquals(NOW.truncatedTo(ChronoUnit.MICROS), response.review().reviewedAt());
        assertEquals("Buen trabajo", response.review().observation());
    }

    @Test
    void shouldReviewWithoutObservationWhenThereIsNoBody() {
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.of(finishedSession()));

        TrainingSessionResponse response = service.review(COACH_USER, ATHLETE_ID, SESSION_ID, null);

        assertNotNull(response.review());
        assertNull(response.review().observation());
    }

    @Test
    void shouldReplaceAnEarlierReviewWithTheNewOne() {
        TrainingSession finished = finishedSession();
        finished.review(ENDED_AT, "Primera");
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.of(finished));

        TrainingSessionResponse response = service.review(COACH_USER, ATHLETE_ID, SESSION_ID,
                new ReviewTrainingSessionRequest(null));

        assertEquals(NOW.truncatedTo(ChronoUnit.MICROS), response.review().reviewedAt());
        assertNull(response.review().observation());
    }

    @Test
    void shouldReturn404WhenTheSessionDoesNotExistOrBelongsToAnotherAthlete() {
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.empty());

        assertThrows(TrainingSessionNotFoundException.class,
                () -> service.review(COACH_USER, ATHLETE_ID, SESSION_ID, new ReviewTrainingSessionRequest("Hola")));
        verifyNoInteractions(performedSetRepository);
    }

    @Test
    void shouldRejectASessionThatIsNotFinishedAndLeaveItUnreviewed() {
        TrainingSession inProgress = withSessionId(session(assignment, upper, NOV_11));
        when(trainingSessionRepository.findDetail(ATHLETE_ID, SESSION_ID)).thenReturn(Optional.of(inProgress));

        assertThrows(TrainingSessionNotReviewableException.class,
                () -> service.review(COACH_USER, ATHLETE_ID, SESSION_ID, new ReviewTrainingSessionRequest("Hola")));
        assertFalse(inProgress.isReviewed());
    }

    @Test
    void shouldStopBeforeAnyLookupWhenTheAthleteIsNotTheCoachs() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service.review(COACH_USER, ATHLETE_ID, SESSION_ID, new ReviewTrainingSessionRequest("Hola")));
        verifyNoInteractions(trainingSessionRepository, performedSetRepository);
    }

    private TrainingSession finishedSession() {
        TrainingSession session = withSessionId(session(assignment, upper, NOV_11));
        session.finish(ENDED_AT);
        return session;
    }

    private static TrainingSession withSessionId(TrainingSession session) {
        ReflectionTestUtils.setField(session, "id", SESSION_ID);
        return session;
    }
}
