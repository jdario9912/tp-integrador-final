package com.gestion_deportiva.api.exercise.service;

import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.exercise.dto.ExerciseRequest;
import com.gestion_deportiva.api.exercise.dto.ExerciseResponse;
import com.gestion_deportiva.api.exercise.dto.ExerciseSearchFilter;
import com.gestion_deportiva.api.exercise.exception.ExerciseAccessDeniedException;
import com.gestion_deportiva.api.exercise.exception.ExerciseInUseException;
import com.gestion_deportiva.api.exercise.exception.ExerciseNameAlreadyExistsException;
import com.gestion_deportiva.api.exercise.exception.ExerciseNotFoundException;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.VIDEO_URL;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exerciseRequest;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exerciseRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    private static final UUID COACH_ID = UUID.randomUUID();
    private static final UUID OTHER_COACH_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final Instant NOW = Instant.parse("2026-11-05T10:00:00Z");

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private CoachRepository coachRepository;

    private ExerciseService exerciseService;

    private Coach coach;

    @BeforeEach
    void setUp() {
        exerciseService = new ExerciseService(exerciseRepository, coachRepository, Clock.fixed(NOW, ZoneOffset.UTC));
        coach = coachWithId("ana@test.com", COACH_ID);
    }

    // ---------- create ----------

    @Test
    void shouldCreateExerciseAuthoredByTheCoach() {
        // Arrange
        ExerciseRequest request = exerciseRequest("Press de banca");
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(exerciseRepository.saveAndFlush(any(Exercise.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        ExerciseResponse response = exerciseService.create(COACH_ID, request);

        // Assert
        Exercise saved = captureSaved();
        assertSame(coach, saved.getCreatedBy());
        assertEquals("Press de banca", saved.getName());
        assertEquals(MuscleGroup.CHEST, saved.getMuscleGroup());
        assertEquals(request.description(), saved.getDescription());
        assertEquals(VIDEO_URL, saved.getVideoUrl());
        assertFalse(response.global());
        assertEquals("Press de banca", response.name());
    }

    @Test
    void shouldTrimTextsAndStoreBlankOptionalsAsNull() {
        // Arrange
        ExerciseRequest request = new ExerciseRequest("  Press  ", MuscleGroup.CHEST, "   ", "");
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(exerciseRepository.saveAndFlush(any(Exercise.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        exerciseService.create(COACH_ID, request);

        // Assert
        Exercise saved = captureSaved();
        assertEquals("Press", saved.getName());
        assertNull(saved.getDescription());
        assertNull(saved.getVideoUrl());
        verify(exerciseRepository).existsByCreatedByIdAndNameIgnoreCase(COACH_ID, "Press");
    }

    @Test
    void shouldThrowWhenTheCoachAlreadyHasAnExerciseWithThatName() {
        // Arrange
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(COACH_ID, "Press de banca")).thenReturn(true);

        // Act + Assert
        assertThrows(ExerciseNameAlreadyExistsException.class,
                () -> exerciseService.create(COACH_ID, exerciseRequest(" Press de banca ")));
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowWhenTheCoachNoLongerExists() {
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.empty());

        assertThrows(CoachNotFoundException.class,
                () -> exerciseService.create(COACH_ID, exerciseRequest("Press")));
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldPropagateTheUniqueIndexViolationOfAConcurrentCreate() {
        // Arrange: el chequeo previo pasa, pero otra alta ganó la carrera
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
        when(exerciseRepository.saveAndFlush(any(Exercise.class)))
                .thenThrow(new DataIntegrityViolationException("ux_exercises_coach_name"));

        // Act + Assert: la resuelve el GlobalExceptionHandler como 409
        assertThrows(DataIntegrityViolationException.class,
                () -> exerciseService.create(COACH_ID, exerciseRequest("Press")));
    }

    // ---------- findVisible ----------

    @Test
    @SuppressWarnings("unchecked")
    void shouldListWithAFixedSortIgnoringTheClientSort() {
        // Arrange
        Exercise global = exercise("Sentadilla", MuscleGroup.QUADRICEPS, null);
        Pageable requested = PageRequest.of(2, 10, Sort.by("createdBy"));
        when(exerciseRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(global), PageRequest.of(2, 10), 21));

        // Act
        PageResponse<ExerciseResponse> page = exerciseService.findVisible(COACH_ID,
                new ExerciseSearchFilter("sent", MuscleGroup.QUADRICEPS), requested);

        // Assert
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(exerciseRepository).findAll(any(Specification.class), pageable.capture());
        assertEquals(2, pageable.getValue().getPageNumber());
        assertEquals(10, pageable.getValue().getPageSize());
        assertEquals(ExerciseService.CATALOG_SORT, pageable.getValue().getSort());
        assertEquals(21, page.totalElements());
        assertEquals(3, page.totalPages());
        assertTrue(page.content().get(0).global());
    }

    // ---------- findById ----------

    @Test
    void shouldReturnAGlobalExercise() {
        givenExercise(exercise("Sentadilla", MuscleGroup.QUADRICEPS, null));

        assertTrue(exerciseService.findById(COACH_ID, EXERCISE_ID).global());
    }

    @Test
    void shouldReturnAnOwnExercise() {
        givenExercise(exercise("Press", MuscleGroup.CHEST, coach));

        assertEquals("Press", exerciseService.findById(COACH_ID, EXERCISE_ID).name());
    }

    @Test
    void shouldDenyReadingAnotherCoachsExercise() {
        givenExercise(exercise("Press", MuscleGroup.CHEST, coachWithId("bruno@test.com", OTHER_COACH_ID)));

        ExerciseAccessDeniedException ex = assertThrows(ExerciseAccessDeniedException.class,
                () -> exerciseService.findById(COACH_ID, EXERCISE_ID));
        assertEquals(ExerciseAccessDeniedException.NOT_OWNER_MESSAGE, ex.getMessage());
    }

    @Test
    void shouldThrowNotFoundWhenTheExerciseDoesNotExist() {
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.empty());

        assertThrows(ExerciseNotFoundException.class, () -> exerciseService.findById(COACH_ID, EXERCISE_ID));
    }

    // ---------- update ----------

    @Test
    void shouldUpdateAnOwnExercise() {
        // Arrange
        Exercise exercise = exercise("Press", MuscleGroup.CHEST, coach);
        exercise.setDescription("vieja");
        exercise.setVideoUrl(VIDEO_URL);
        givenExercise(exercise);
        when(exerciseRepository.saveAndFlush(exercise)).thenReturn(exercise);

        // Act
        ExerciseResponse response = exerciseService.update(COACH_ID, EXERCISE_ID,
                new ExerciseRequest(" Remo ", MuscleGroup.BACK, null, null));

        // Assert: reemplaza todo; los opcionales que no vienen quedan en null
        assertEquals("Remo", exercise.getName());
        assertEquals(MuscleGroup.BACK, exercise.getMuscleGroup());
        assertNull(exercise.getDescription());
        assertNull(exercise.getVideoUrl());
        assertSame(coach, exercise.getCreatedBy());
        assertEquals("Remo", response.name());
    }

    @Test
    void shouldNotTreatTheOwnNameInOtherCaseAsDuplicate() {
        // Arrange
        Exercise exercise = exercise("Press", MuscleGroup.CHEST, coach);
        givenExercise(exercise);
        when(exerciseRepository.saveAndFlush(exercise)).thenReturn(exercise);

        // Act
        exerciseService.update(COACH_ID, EXERCISE_ID, exerciseRequestWithOnlyRequired("PRESS"));

        // Assert
        assertEquals("PRESS", exercise.getName());
        verify(exerciseRepository, never()).existsByCreatedByIdAndNameIgnoreCase(any(), anyString());
    }

    @Test
    void shouldThrowWhenRenamingToAnotherOwnExercisesName() {
        // Arrange
        givenExercise(exercise("Press", MuscleGroup.CHEST, coach));
        when(exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(COACH_ID, "Remo")).thenReturn(true);

        // Act + Assert
        assertThrows(ExerciseNameAlreadyExistsException.class,
                () -> exerciseService.update(COACH_ID, EXERCISE_ID, exerciseRequest("Remo")));
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldDenyUpdatingAGlobalExercise() {
        givenExercise(exercise("Sentadilla", MuscleGroup.QUADRICEPS, null));

        ExerciseAccessDeniedException ex = assertThrows(ExerciseAccessDeniedException.class,
                () -> exerciseService.update(COACH_ID, EXERCISE_ID, exerciseRequest("Otra")));
        assertEquals(ExerciseAccessDeniedException.GLOBAL_MESSAGE, ex.getMessage());
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldDenyUpdatingAnotherCoachsExercise() {
        givenExercise(exercise("Press", MuscleGroup.CHEST, coachWithId("bruno@test.com", OTHER_COACH_ID)));

        assertThrows(ExerciseAccessDeniedException.class,
                () -> exerciseService.update(COACH_ID, EXERCISE_ID, exerciseRequest("Otra")));
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowNotFoundWhenUpdatingAMissingExercise() {
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.empty());

        assertThrows(ExerciseNotFoundException.class,
                () -> exerciseService.update(COACH_ID, EXERCISE_ID, exerciseRequest("Otra")));
    }

    // ---------- delete ----------

    @Test
    void shouldSoftDeleteAnOwnExercise() {
        // Arrange
        Exercise exercise = exercise("Press", MuscleGroup.CHEST, coach);
        givenExercise(exercise);

        // Act
        exerciseService.delete(COACH_ID, EXERCISE_ID);

        // Assert
        assertEquals(NOW, exercise.getDeletedAt());
        verify(exerciseRepository).saveAndFlush(exercise);
        verify(exerciseRepository, never()).delete(any(Exercise.class));
    }

    @Test
    void shouldDenyDeletingAGlobalOrAnotherCoachsExercise() {
        Exercise global = exercise("Sentadilla", MuscleGroup.QUADRICEPS, null);
        Exercise foreign = exercise("Press", MuscleGroup.CHEST, coachWithId("bruno@test.com", OTHER_COACH_ID));
        UUID foreignId = UUID.randomUUID();
        givenExercise(global);
        when(exerciseRepository.findById(foreignId)).thenReturn(Optional.of(foreign));

        assertThrows(ExerciseAccessDeniedException.class, () -> exerciseService.delete(COACH_ID, EXERCISE_ID));
        assertThrows(ExerciseAccessDeniedException.class, () -> exerciseService.delete(COACH_ID, foreignId));
        assertFalse(global.isDeleted());
        assertFalse(foreign.isDeleted());
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldRejectDeletingAnExerciseUsedInRoutines() {
        // Arrange
        Exercise exercise = exercise("Press", MuscleGroup.CHEST, coach);
        givenExercise(exercise);
        when(exerciseRepository.isUsedInRoutines(EXERCISE_ID)).thenReturn(true);

        // Act + Assert
        assertThrows(ExerciseInUseException.class, () -> exerciseService.delete(COACH_ID, EXERCISE_ID));
        assertFalse(exercise.isDeleted());
        verify(exerciseRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowNotFoundWhenDeletingAMissingExercise() {
        when(exerciseRepository.findById(eq(EXERCISE_ID))).thenReturn(Optional.empty());

        assertThrows(ExerciseNotFoundException.class, () -> exerciseService.delete(COACH_ID, EXERCISE_ID));
    }

    private void givenExercise(Exercise exercise) {
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(exercise));
    }

    private Exercise captureSaved() {
        ArgumentCaptor<Exercise> captor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static Coach coachWithId(String email, UUID id) {
        Coach coach = coach(email);
        ReflectionTestUtils.setField(coach, "id", id);
        return coach;
    }
}
