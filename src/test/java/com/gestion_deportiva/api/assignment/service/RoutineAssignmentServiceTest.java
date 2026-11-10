package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.dto.RoutineAssignmentResponse;
import com.gestion_deportiva.api.assignment.exception.ActiveAssignmentExistsException;
import com.gestion_deportiva.api.assignment.exception.AthleteNotAssignableException;
import com.gestion_deportiva.api.assignment.exception.IncompleteRoutineException;
import com.gestion_deportiva.api.assignment.exception.RoutineAlreadyActiveException;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.exception.RoutineNotFoundException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.service.RoutineService;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignRequest;
import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.AssignmentFixtures.completeRoutine;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
class RoutineAssignmentServiceTest {

    private static final UUID COACH_ID = UUID.randomUUID();
    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(COACH_ID, Role.COACH);

    // 23:30 del 9/11 en Argentina (UTC-3): en UTC ya es 10/11
    private static final Instant ARGENTINA_LATE_NIGHT = Instant.parse("2026-11-10T02:30:00Z");
    private static final LocalDate NOV_1 = LocalDate.of(2026, 11, 1);
    private static final LocalDate NOV_9 = LocalDate.of(2026, 11, 9);

    @Mock
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    @Mock
    private RoutineService routineService;

    private RoutineAssignmentService routineAssignmentService;

    private Coach ana;

    private Athlete leo;

    private Exercise bench;

    private Routine strength;

    private Routine hypertrophy;

    @BeforeEach
    void setUp() {
        routineAssignmentService = new RoutineAssignmentService(routineAssignmentRepository, athleteRepository,
                athleteAccessGuard, routineService, Clock.fixed(ARGENTINA_LATE_NIGHT, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        ana = withId(coach("ana@test.com"), COACH_ID);
        leo = withId(athlete("leo@test.com", ana), ATHLETE_ID);
        bench = exercise("Press banca", MuscleGroup.CHEST, null);
        strength = withId(completeRoutine("Fuerza", ana, bench), UUID.randomUUID());
        hypertrophy = withId(completeRoutine("Hipertrofia", ana, bench), UUID.randomUUID());
    }

    // ---------- alta ----------

    @Test
    void shouldAssignTheRoutineAsActiveWithTodayInTheAppTimeZone() {
        // Arrange
        givenTheAthlete();
        givenTheRoutine(strength);
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.empty());
        givenTheSaveReturnsTheAssignment();

        // Act
        RoutineAssignmentResponse response = routineAssignmentService.assign(COACH_ID, ATHLETE_ID,
                assignRequest(strength.getId(), null));

        // Assert
        RoutineAssignment saved = captureSaved();
        assertSame(leo, saved.getAthlete());
        assertSame(strength, saved.getRoutine());
        assertEquals(NOV_9, saved.getAssignmentDate());
        assertTrue(saved.isActive());
        assertEquals(strength.getId(), response.routineId());
        assertEquals("Fuerza", response.routineName());
        assertEquals(NOV_9, response.assignmentDate());
        assertTrue(response.active());
    }

    @Test
    void shouldAssignNormallyWhenReplaceActiveComesWithoutAnActiveAssignment() {
        givenTheAthlete();
        givenTheRoutine(strength);
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.empty());
        givenTheSaveReturnsTheAssignment();

        RoutineAssignmentResponse response = routineAssignmentService.assign(COACH_ID, ATHLETE_ID,
                assignRequest(strength.getId(), true));

        assertTrue(response.active());
        verify(routineAssignmentRepository, never()).flush();
    }

    @Test
    void shouldAssignATemplateRoutine() {
        givenTheAthlete();
        strength.setTemplate(true);
        givenTheRoutine(strength);
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.empty());
        givenTheSaveReturnsTheAssignment();

        RoutineAssignmentResponse response = routineAssignmentService.assign(COACH_ID, ATHLETE_ID,
                assignRequest(strength.getId(), false));

        assertEquals(strength.getId(), response.routineId());
    }

    // ---------- rutina activa: confirmación y reemplazo ----------

    @Test
    void shouldAskForConfirmationWhenTheAthleteHasAnotherActiveRoutine() {
        // Arrange
        givenTheAthlete();
        givenTheRoutine(hypertrophy);
        givenTheActiveAssignment(assignment(leo, strength, NOV_1));

        // Act
        ActiveAssignmentExistsException ex = assertThrows(ActiveAssignmentExistsException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(hypertrophy.getId(), false)));

        // Assert
        assertTrue(ex.getMessage().contains("«Fuerza»"));
        verify(routineAssignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldAskForConfirmationWhenReplaceActiveIsNull() {
        givenTheAthlete();
        givenTheRoutine(hypertrophy);
        givenTheActiveAssignment(assignment(leo, strength, NOV_1));

        assertThrows(ActiveAssignmentExistsException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(hypertrophy.getId(), null)));
    }

    @Test
    void shouldDeactivateThePreviousOneBeforeInsertingTheNewOneWhenReplacing() {
        // Arrange
        givenTheAthlete();
        givenTheRoutine(hypertrophy);
        RoutineAssignment previous = assignment(leo, strength, NOV_1);
        givenTheActiveAssignment(previous);
        givenTheSaveReturnsTheAssignment();

        // Act
        RoutineAssignmentResponse response = routineAssignmentService.assign(COACH_ID, ATHLETE_ID,
                assignRequest(hypertrophy.getId(), true));

        // Assert
        assertFalse(previous.isActive());
        assertTrue(response.active());
        assertEquals("Hipertrofia", response.routineName());
        // El UPDATE de la anterior tiene que llegar a la base antes del INSERT (índice parcial de la activa)
        InOrder order = inOrder(routineAssignmentRepository);
        order.verify(routineAssignmentRepository).flush();
        order.verify(routineAssignmentRepository).saveAndFlush(any(RoutineAssignment.class));
    }

    @Test
    void shouldRejectTheRoutineThatIsAlreadyActiveEvenWhenReplacing() {
        givenTheAthlete();
        givenTheRoutine(strength);
        RoutineAssignment active = assignment(leo, strength, NOV_1);
        givenTheActiveAssignment(active);

        assertThrows(RoutineAlreadyActiveException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), true)));
        assertTrue(active.isActive());
        verify(routineAssignmentRepository, never()).saveAndFlush(any());
    }

    // ---------- atleta ----------

    @Test
    void shouldThrowWhenTheAthleteDoesNotExist() {
        when(athleteRepository.findById(ATHLETE_ID)).thenReturn(Optional.empty());

        assertThrows(AthleteNotFoundException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), null)));
        verifyNoInteractions(routineService, routineAssignmentRepository);
    }

    @Test
    void shouldRejectAnUnlinkedAthlete() {
        leo.unassignCoach();
        givenTheAthlete();

        AthleteNotAssignableException ex = assertThrows(AthleteNotAssignableException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), null)));
        assertEquals(AthleteNotAssignableException.UNLINKED_MESSAGE, ex.getMessage());
        verifyNoInteractions(routineService, routineAssignmentRepository);
    }

    @Test
    void shouldDenyTheAthleteOfAnotherCoach() {
        leo.assignCoach(withId(coach("bruno@test.com"), UUID.randomUUID()));
        givenTheAthlete();

        assertThrows(AthleteAccessDeniedException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), null)));
        verifyNoInteractions(routineService, routineAssignmentRepository);
    }

    @Test
    void shouldDenyTheAthleteOfAnotherCoachBeforeCheckingIfItIsDeactivated() {
        leo.assignCoach(withId(coach("bruno@test.com"), UUID.randomUUID()));
        leo.deactivate();
        givenTheAthlete();

        assertThrows(AthleteAccessDeniedException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), null)));
    }

    @Test
    void shouldRejectADeactivatedAthlete() {
        leo.deactivate();
        givenTheAthlete();

        AthleteNotAssignableException ex = assertThrows(AthleteNotAssignableException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), null)));
        assertEquals(AthleteNotAssignableException.INACTIVE_MESSAGE, ex.getMessage());
        verifyNoInteractions(routineService, routineAssignmentRepository);
    }

    // ---------- rutina ----------

    @Test
    void shouldPropagateRoutineNotFound() {
        givenTheAthlete();
        UUID missing = UUID.randomUUID();
        when(routineService.findOwned(COACH_ID, missing)).thenThrow(new RoutineNotFoundException(missing));

        assertThrows(RoutineNotFoundException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(missing, null)));
        verifyNoInteractions(routineAssignmentRepository);
    }

    @Test
    void shouldPropagateTheRoutineOfAnotherCoach() {
        givenTheAthlete();
        doThrow(RoutineAccessDeniedException.notOwner()).when(routineService).findOwned(COACH_ID, strength.getId());

        assertThrows(RoutineAccessDeniedException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), null)));
        verifyNoInteractions(routineAssignmentRepository);
    }

    @Test
    void shouldRejectARoutineWithoutDays() {
        givenTheAthlete();
        Routine empty = withId(routine("Vacía", ana), UUID.randomUUID());
        givenTheRoutine(empty);

        assertThrows(IncompleteRoutineException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(empty.getId(), null)));
        verifyNoInteractions(routineAssignmentRepository);
    }

    @Test
    void shouldRejectARoutineWithADayWithoutExercises() {
        givenTheAthlete();
        strength.addDay("Tirón");
        givenTheRoutine(strength);

        assertThrows(IncompleteRoutineException.class,
                () -> routineAssignmentService.assign(COACH_ID, ATHLETE_ID, assignRequest(strength.getId(), true)));
        verifyNoInteractions(routineAssignmentRepository);
    }

    // ---------- historial ----------

    @Test
    void shouldVerifyAccessAndReturnTheHistoryPage() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 20);
        RoutineAssignment active = assignment(leo, hypertrophy, NOV_9);
        RoutineAssignment previous = assignment(leo, strength, NOV_1);
        previous.deactivate();
        when(routineAssignmentRepository.findHistory(ATHLETE_ID, pageable))
                .thenReturn(new PageImpl<>(List.of(active, previous), pageable, 2));

        // Act
        PageResponse<RoutineAssignmentResponse> page = routineAssignmentService.findByAthlete(COACH_USER,
                ATHLETE_ID, pageable);

        // Assert
        verify(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);
        assertEquals(2, page.content().size());
        assertEquals("Hipertrofia", page.content().get(0).routineName());
        assertTrue(page.content().get(0).active());
        assertFalse(page.content().get(1).active());
        assertEquals(2, page.totalElements());
    }

    @Test
    void shouldNotQueryTheHistoryWhenAccessIsDenied() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> routineAssignmentService.findByAthlete(COACH_USER, ATHLETE_ID, PageRequest.of(0, 20)));
        verifyNoInteractions(routineAssignmentRepository);
    }

    private void givenTheAthlete() {
        when(athleteRepository.findById(ATHLETE_ID)).thenReturn(Optional.of(leo));
    }

    private void givenTheRoutine(Routine routine) {
        when(routineService.findOwned(COACH_ID, routine.getId())).thenReturn(routine);
    }

    private void givenTheActiveAssignment(RoutineAssignment active) {
        when(routineAssignmentRepository.findByAthleteIdAndActiveTrue(ATHLETE_ID)).thenReturn(Optional.of(active));
    }

    private void givenTheSaveReturnsTheAssignment() {
        when(routineAssignmentRepository.saveAndFlush(any(RoutineAssignment.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private RoutineAssignment captureSaved() {
        ArgumentCaptor<RoutineAssignment> captor = ArgumentCaptor.forClass(RoutineAssignment.class);
        verify(routineAssignmentRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static <T> T withId(T entity, UUID id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
