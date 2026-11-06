package com.gestion_deportiva.api.routine.service;

import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.dto.RoutineResponse;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.exception.RoutineNameAlreadyExistsException;
import com.gestion_deportiva.api.routine.exception.RoutineNotFoundException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoutineServiceTest {

    private static final UUID COACH_ID = UUID.randomUUID();
    private static final UUID OTHER_COACH_ID = UUID.randomUUID();
    private static final UUID ROUTINE_ID = UUID.randomUUID();

    @Mock
    private RoutineRepository routineRepository;

    @Mock
    private CoachRepository coachRepository;

    private RoutineService routineService;

    private Coach coach;

    @BeforeEach
    void setUp() {
        routineService = new RoutineService(routineRepository, coachRepository);
        coach = coachWithId("ana@test.com", COACH_ID);
    }

    // ---------- create ----------

    @Test
    void shouldCreateRoutineOwnedByTheCoach() {
        // Arrange
        RoutineRequest request = routineRequest("Fuerza 4 días");
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(routineRepository.saveAndFlush(any(Routine.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        RoutineResponse response = routineService.create(COACH_ID, request);

        // Assert
        Routine saved = captureSaved();
        assertSame(coach, saved.getCoach());
        assertEquals("Fuerza 4 días", saved.getName());
        assertEquals(request.description(), saved.getDescription());
        assertEquals(request.goal(), saved.getGoal());
        assertEquals(request.daysPerWeek(), saved.getDaysPerWeek());
        assertEquals(request.durationWeeks(), saved.getDurationWeeks());
        assertTrue(saved.isTemplate());
        assertEquals("Fuerza 4 días", response.name());
        assertTrue(response.isTemplate());
    }

    @Test
    void shouldTrimTextsStoreBlankOptionalsAsNullAndDefaultToNotTemplate() {
        // Arrange
        RoutineRequest request = new RoutineRequest("  Fuerza  ", "   ", "", null, null, null);
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(routineRepository.saveAndFlush(any(Routine.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        routineService.create(COACH_ID, request);

        // Assert
        Routine saved = captureSaved();
        assertEquals("Fuerza", saved.getName());
        assertNull(saved.getDescription());
        assertNull(saved.getGoal());
        assertNull(saved.getDaysPerWeek());
        assertNull(saved.getDurationWeeks());
        assertFalse(saved.isTemplate());
        verify(routineRepository).existsByCoachIdAndNameIgnoreCase(COACH_ID, "Fuerza");
    }

    @Test
    void shouldThrowWhenTheCoachAlreadyHasARoutineWithThatName() {
        // Arrange
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(routineRepository.existsByCoachIdAndNameIgnoreCase(COACH_ID, "Fuerza")).thenReturn(true);

        // Act + Assert
        assertThrows(RoutineNameAlreadyExistsException.class,
                () -> routineService.create(COACH_ID, routineRequestWithOnlyRequired(" Fuerza ")));
        verify(routineRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowWhenTheCoachNoLongerExists() {
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.empty());

        assertThrows(CoachNotFoundException.class,
                () -> routineService.create(COACH_ID, routineRequest("Fuerza")));
        verify(routineRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldPropagateTheUniqueIndexViolationOfAConcurrentCreate() {
        // Arrange: el exists no la vio, pero otra alta simultánea ganó la carrera
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(routineRepository.saveAndFlush(any(Routine.class)))
                .thenThrow(new DataIntegrityViolationException("ux_routines_coach_name"));

        // Act + Assert: la resuelve el GlobalExceptionHandler como 409
        assertThrows(DataIntegrityViolationException.class,
                () -> routineService.create(COACH_ID, routineRequest("Fuerza")));
    }

    // ---------- findMine ----------

    @Test
    void shouldListTheCoachsRoutinesWithAFixedSortIgnoringTheClientSort() {
        // Arrange
        Pageable requested = PageRequest.of(2, 10, Sort.by("createdAt"));
        when(routineRepository.findByCoachId(eq(COACH_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(routine("Fuerza", coach)), PageRequest.of(2, 10), 21));

        // Act
        PageResponse<RoutineResponse> page = routineService.findMine(COACH_ID, requested);

        // Assert
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(routineRepository).findByCoachId(eq(COACH_ID), pageable.capture());
        assertEquals(2, pageable.getValue().getPageNumber());
        assertEquals(10, pageable.getValue().getPageSize());
        assertEquals(RoutineService.MY_ROUTINES_SORT, pageable.getValue().getSort());
        assertEquals(21, page.totalElements());
        assertEquals(3, page.totalPages());
        assertEquals("Fuerza", page.content().get(0).name());
    }

    // ---------- findById ----------

    @Test
    void shouldReturnAnOwnRoutine() {
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine("Fuerza", coach)));

        assertEquals("Fuerza", routineService.findById(COACH_ID, ROUTINE_ID).name());
    }

    @Test
    void shouldDenyReadingAnotherCoachsRoutine() {
        when(routineRepository.findById(ROUTINE_ID))
                .thenReturn(Optional.of(routine("Fuerza", coachWithId("bruno@test.com", OTHER_COACH_ID))));

        RoutineAccessDeniedException ex = assertThrows(RoutineAccessDeniedException.class,
                () -> routineService.findById(COACH_ID, ROUTINE_ID));
        assertEquals(RoutineAccessDeniedException.NOT_OWNER_MESSAGE, ex.getMessage());
    }

    @Test
    void shouldThrowNotFoundWhenTheRoutineDoesNotExist() {
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.empty());

        assertThrows(RoutineNotFoundException.class, () -> routineService.findById(COACH_ID, ROUTINE_ID));
    }

    private Routine captureSaved() {
        ArgumentCaptor<Routine> captor = ArgumentCaptor.forClass(Routine.class);
        verify(routineRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static Coach coachWithId(String email, UUID id) {
        Coach coach = coach(email);
        ReflectionTestUtils.setField(coach, "id", id);
        return coach;
    }
}
