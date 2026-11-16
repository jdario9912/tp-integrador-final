package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.dto.TrainingSessionHistoryFilter;
import com.gestion_deportiva.api.training.dto.TrainingSessionHistoryItem;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyShort;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Historial de sesiones cerradas (US-21, contrato 15.2 y 15.6): pertenencia antes de consultar, el rango y la página
// pasan al repositorio, y el resumen y el detalle de la página se piden una sola vez (sin N+1)
@ExtendWith(MockitoExtension.class)
class TrainingSessionHistoryServiceTest {

    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);
    private static final Pageable PAGE = PageRequest.of(0, 20);
    private static final TrainingSessionHistoryFilter NO_RANGE = new TrainingSessionHistoryFilter(null, null);
    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);
    // Estados de las series: DONE = 1 y SKIPPED = 2 (V11)
    private static final short DONE = 1;
    private static final short SKIPPED = 2;

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private TrainingSessionHistoryService service;

    private RoutineAssignment assignment;

    private RoutineDay upper;

    private RoutineDay lower;

    @BeforeEach
    void setUp() {
        service = new TrainingSessionHistoryService(trainingSessionRepository, athleteAccessGuard);

        Coach ana = coach("ana@test.com");
        Exercise bench = exercise("Press banca", MuscleGroup.CHEST, ana);
        Exercise squat = exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana);
        Routine strength = routine("Fuerza", ana);
        // Torso: 4 series prescritas; Pierna: 3
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        lower = strength.addDay("Pierna");
        lower.addExercise(routineExercise(squat));
        assignment = assignment(athlete("leo@test.com", ana), strength, NOV_3);
    }

    @Test
    void shouldVerifyTheAccessBeforeQueryingTheHistory() {
        when(trainingSessionRepository.findHistory(ATHLETE_ID, null, null, PAGE))
                .thenReturn(new PageImpl<>(List.of(), PAGE, 0));

        service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE);

        InOrder order = inOrder(athleteAccessGuard, trainingSessionRepository);
        order.verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        order.verify(trainingSessionRepository).findHistory(ATHLETE_ID, null, null, PAGE);
    }

    @Test
    void shouldStopBeforeQueryingWhenTheAthleteIsNotVisible() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class,
                () -> service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE));
        verifyNoInteractions(trainingSessionRepository);
    }

    @Test
    void shouldPassTheRangeAndThePageToTheRepository() {
        TrainingSessionHistoryFilter range = new TrainingSessionHistoryFilter(NOV_3, NOV_11);
        when(trainingSessionRepository.findHistory(ATHLETE_ID, NOV_3, NOV_11, PAGE))
                .thenReturn(new PageImpl<>(List.of(), PAGE, 0));

        service.findHistory(ATHLETE_USER, ATHLETE_ID, range, PAGE);

        verify(trainingSessionRepository).findHistory(ATHLETE_ID, NOV_3, NOV_11, PAGE);
    }

    @Test
    void shouldMapEachSessionWithItsOwnSummary() {
        TrainingSession first = sessionWithId(NOV_11, upper);
        TrainingSession second = sessionWithId(NOV_3, lower);
        stubPage(first, second);
        when(trainingSessionRepository.findSummaryRows(List.of(first.getId(), second.getId()), DONE, SKIPPED))
                .thenReturn(rows(
                        row(first.getId(), 4, 3, 1, "1580"),
                        row(second.getId(), 3, 0, 0, "0")));

        PageResponse<TrainingSessionHistoryItem> page = service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE);

        TrainingSessionHistoryItem firstItem = page.content().get(0);
        assertEquals(first.getId(), firstItem.id());
        assertEquals("Fuerza", firstItem.routineName());
        assertEquals("Torso", firstItem.dayName());
        assertEquals(4, firstItem.summary().prescribedSets());
        assertEquals(3, firstItem.summary().doneSets());
        assertEquals(1, firstItem.summary().skippedSets());
        assertEquals(0, firstItem.summary().pendingSets());
        assertEquals(new BigDecimal("1580.00"), firstItem.summary().volumeKg());

        TrainingSessionHistoryItem secondItem = page.content().get(1);
        assertEquals("Pierna", secondItem.dayName());
        assertEquals(3, secondItem.summary().pendingSets());
    }

    @Test
    void shouldReadTheDetailsAndTheSummaryOncePerPage() {
        TrainingSession first = sessionWithId(NOV_11, upper);
        TrainingSession second = sessionWithId(NOV_3, lower);
        stubPage(first, second);
        when(trainingSessionRepository.findSummaryRows(anyCollection(), anyShort(), anyShort()))
                .thenReturn(rows(row(first.getId(), 4, 0, 0, "0"), row(second.getId(), 3, 0, 0, "0")));

        service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE);

        // Dos sesiones en la página, pero una sola consulta de detalle y una sola de resumen (sin N+1)
        verify(trainingSessionRepository, times(1)).findHistoryDetails(anyList());
        verify(trainingSessionRepository, times(1)).findSummaryRows(anyCollection(), anyShort(), anyShort());
    }

    @Test
    void shouldNotQueryTheDetailsNorTheSummariesForAnEmptyPage() {
        when(trainingSessionRepository.findHistory(ATHLETE_ID, null, null, PAGE))
                .thenReturn(new PageImpl<>(List.of(), PAGE, 0));

        PageResponse<TrainingSessionHistoryItem> page = service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE);

        assertTrue(page.content().isEmpty());
        assertEquals(0, page.totalElements());
        verify(trainingSessionRepository, never()).findHistoryDetails(anyList());
        verify(trainingSessionRepository, never()).findSummaryRows(anyCollection(), anyShort(), anyShort());
    }

    @Test
    void shouldCarryThePageMetadata() {
        TrainingSession first = sessionWithId(NOV_11, upper);
        when(trainingSessionRepository.findHistory(ATHLETE_ID, null, null, PAGE))
                .thenReturn(new PageImpl<>(List.of(first), PAGE, 21));
        when(trainingSessionRepository.findHistoryDetails(List.of(first.getId()))).thenReturn(List.of(first));
        when(trainingSessionRepository.findSummaryRows(List.of(first.getId()), DONE, SKIPPED))
                .thenReturn(rows(row(first.getId(), 4, 0, 0, "0")));

        PageResponse<TrainingSessionHistoryItem> page = service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE);

        assertEquals(0, page.page());
        assertEquals(20, page.size());
        assertEquals(21, page.totalElements());
        assertEquals(2, page.totalPages());
    }

    @Test
    void shouldCarryTheReviewOfAReviewedSession() {
        TrainingSession reviewed = sessionWithId(NOV_11, upper);
        reviewed.review(Instant.parse("2026-11-12T12:00:00Z"), "Buen trabajo");
        when(trainingSessionRepository.findHistory(ATHLETE_ID, null, null, PAGE))
                .thenReturn(new PageImpl<>(List.of(reviewed), PAGE, 1));
        when(trainingSessionRepository.findHistoryDetails(List.of(reviewed.getId()))).thenReturn(List.of(reviewed));
        when(trainingSessionRepository.findSummaryRows(List.of(reviewed.getId()), DONE, SKIPPED))
                .thenReturn(rows(row(reviewed.getId(), 4, 0, 0, "0")));

        TrainingSessionHistoryItem item = service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE)
                .content().get(0);

        assertEquals("Buen trabajo", item.review().observation());
    }

    @Test
    void shouldHaveNoReviewForASessionNotReviewed() {
        TrainingSession notReviewed = sessionWithId(NOV_3, lower);
        when(trainingSessionRepository.findHistory(ATHLETE_ID, null, null, PAGE))
                .thenReturn(new PageImpl<>(List.of(notReviewed), PAGE, 1));
        when(trainingSessionRepository.findHistoryDetails(List.of(notReviewed.getId())))
                .thenReturn(List.of(notReviewed));
        when(trainingSessionRepository.findSummaryRows(List.of(notReviewed.getId()), DONE, SKIPPED))
                .thenReturn(rows(row(notReviewed.getId(), 3, 0, 0, "0")));

        TrainingSessionHistoryItem item = service.findHistory(ATHLETE_USER, ATHLETE_ID, NO_RANGE, PAGE)
                .content().get(0);

        assertNull(item.review());
    }

    private void stubPage(TrainingSession... sessions) {
        List<TrainingSession> content = List.of(sessions);
        when(trainingSessionRepository.findHistory(ATHLETE_ID, null, null, PAGE))
                .thenReturn(new PageImpl<>(content, PAGE, content.size()));
        when(trainingSessionRepository.findHistoryDetails(content.stream().map(TrainingSession::getId).toList()))
                .thenReturn(content);
    }

    // Sesión finalizada de la asignación del test, con un id fijo para casar con las filas del resumen
    private TrainingSession sessionWithId(LocalDate date, RoutineDay day) {
        TrainingSession session = session(assignment, day, date);
        session.finish(Instant.parse(date + "T23:00:00Z"));
        ReflectionTestUtils.setField(session, "id", UUID.randomUUID());
        return session;
    }

    // Una fila del resumen en el orden de la consulta: id, prescritas, realizadas, omitidas y volumen
    private static Object[] row(UUID sessionId, long prescribed, long done, long skipped, String volume) {
        return new Object[] {sessionId, prescribed, done, skipped, new BigDecimal(volume)};
    }

    // Las filas que devuelve la consulta del resumen (tipadas, para el thenReturn)
    private static List<Object[]> rows(Object[]... rows) {
        return List.of(rows);
    }
}
