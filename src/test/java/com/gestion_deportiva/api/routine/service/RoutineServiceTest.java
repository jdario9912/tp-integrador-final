package com.gestion_deportiva.api.routine.service;

import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.exercise.exception.ExerciseNotFoundException;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.dto.RoutineDetailResponse;
import com.gestion_deportiva.api.routine.dto.RoutineExerciseRequest;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.dto.RoutineResponse;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.exception.RoutineDayHasTrainingSessionsException;
import com.gestion_deportiva.api.routine.exception.RoutineHasPerformedSetsException;
import com.gestion_deportiva.api.routine.exception.RoutineItemNotInRoutineException;
import com.gestion_deportiva.api.routine.exception.RoutineNameAlreadyExistsException;
import com.gestion_deportiva.api.routine.exception.RoutineNotFoundException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
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

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.day;
import static com.gestion_deportiva.api.support.RoutineFixtures.exerciseRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.exerciseRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.RoutineFixtures.structure;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
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

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private PerformedSetChecker performedSetChecker;

    @Mock
    private TrainingSessionChecker trainingSessionChecker;

    private RoutineService routineService;

    private Coach coach;

    @BeforeEach
    void setUp() {
        routineService = new RoutineService(routineRepository, coachRepository, exerciseRepository,
                performedSetChecker, trainingSessionChecker);
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

    @Test
    void shouldReturnTheRoutineWithItsDaysAndExercisesInOrder() {
        // Arrange
        Routine routine = routine("Fuerza", coach);
        Exercise bench = exerciseWithId("Press banca");
        RoutineDay push = routine.addDay("Empuje");
        push.addExercise(routineExercise(bench));
        routine.addDay("Tirón");
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));

        // Act
        RoutineDetailResponse response = routineService.findById(COACH_ID, ROUTINE_ID);

        // Assert
        assertEquals(2, response.days().size());
        assertEquals("Empuje", response.days().get(0).name());
        assertEquals(1, response.days().get(0).dayNumber());
        assertEquals(2, response.days().get(1).dayNumber());
        assertEquals(bench.getId(), response.days().get(0).exercises().get(0).exerciseId());
        assertEquals("Press banca", response.days().get(0).exercises().get(0).exerciseName());
        assertEquals(MuscleGroup.CHEST, response.days().get(0).exercises().get(0).muscleGroup());
        assertTrue(response.days().get(1).exercises().isEmpty());
    }

    // ---------- update (US-15) ----------

    @Test
    void shouldUpdateAllTheDataOfAnOwnRoutine() {
        // Arrange
        Routine routine = Routine.builder().name("Fuerza").coach(coach).description("Vieja").template(true).build();
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));
        RoutineRequest request = new RoutineRequest(" Hipertrofia ", " Nueva ", "", (short) 5, (short) 10, null);

        // Act
        RoutineDetailResponse response = routineService.update(COACH_ID, ROUTINE_ID, request);

        // Assert: reemplaza todo, igual que el alta (isTemplate ausente = false)
        assertEquals("Hipertrofia", routine.getName());
        assertEquals("Nueva", routine.getDescription());
        assertNull(routine.getGoal());
        assertEquals((short) 5, routine.getDaysPerWeek());
        assertEquals((short) 10, routine.getDurationWeeks());
        assertFalse(routine.isTemplate());
        assertEquals("Hipertrofia", response.name());
        verify(routineRepository).existsByCoachIdAndNameIgnoreCaseAndIdNot(COACH_ID, "Hipertrofia", ROUTINE_ID);
        verify(routineRepository).flush();
        verify(routineRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowWhenTheNewNameIsUsedByAnotherOfTheCoachsRoutines() {
        Routine routine = routine("Fuerza", coach);
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));
        when(routineRepository.existsByCoachIdAndNameIgnoreCaseAndIdNot(COACH_ID, "Hipertrofia", ROUTINE_ID))
                .thenReturn(true);

        assertThrows(RoutineNameAlreadyExistsException.class,
                () -> routineService.update(COACH_ID, ROUTINE_ID, routineRequestWithOnlyRequired("Hipertrofia")));
        assertEquals("Fuerza", routine.getName());
        verify(routineRepository, never()).flush();
    }

    @Test
    void shouldDenyUpdatingAnotherCoachsRoutine() {
        when(routineRepository.findById(ROUTINE_ID))
                .thenReturn(Optional.of(routine("Fuerza", coachWithId("bruno@test.com", OTHER_COACH_ID))));

        assertThrows(RoutineAccessDeniedException.class,
                () -> routineService.update(COACH_ID, ROUTINE_ID, routineRequest("Hipertrofia")));
        verify(routineRepository, never()).flush();
    }

    @Test
    void shouldThrowNotFoundWhenUpdatingAnUnknownRoutine() {
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.empty());

        assertThrows(RoutineNotFoundException.class,
                () -> routineService.update(COACH_ID, ROUTINE_ID, routineRequest("Hipertrofia")));
    }

    // ---------- replaceStructure (US-14) ----------

    @Test
    void shouldBuildTheStructureOfARoutineWithoutDays() {
        // Arrange
        Routine routine = routine("Fuerza", coach);
        Exercise bench = exerciseWithId("Press banca");
        Exercise row = exerciseWithId("Remo");
        givenOwnRoutine(routine);
        givenVisibleExercises(bench, row);

        // Act
        RoutineDetailResponse response = routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(
                day(null, " Empuje ", exerciseRequest(null, bench.getId())),
                day(null, "Tirón", exerciseRequestWithOnlyRequired(null, row.getId()))));

        // Assert: entidad
        assertEquals(2, routine.getDays().size());
        RoutineDay push = routine.getDays().get(0);
        assertEquals("Empuje", push.getName());
        assertEquals(1, push.getDayNumber());
        RoutineExercise planned = push.getExercises().get(0);
        assertSame(bench, planned.getExercise());
        assertEquals(4, planned.getSets());
        assertEquals(10, planned.getReps());
        assertEquals(new BigDecimal("60.5"), planned.getRecommendedWeight());
        assertEquals((short) 90, planned.getRest());
        assertEquals("RIR 2", planned.getRirRpe());
        assertEquals("Bajar en 3 segundos", planned.getTechniqueNote());
        RoutineExercise minimal = routine.getDays().get(1).getExercises().get(0);
        assertNull(minimal.getRecommendedWeight());
        assertNull(minimal.getRest());
        assertNull(minimal.getRirRpe());

        // Assert: respuesta
        assertEquals(List.of("Empuje", "Tirón"), response.days().stream().map(d -> d.name()).toList());
        verify(routineRepository).flush();
        verify(performedSetChecker, never()).hasPerformedSets(anyCollection());
    }

    @Test
    void shouldKeepExistingItemsReorderThemAndRemoveTheMissingOnes() {
        // Arrange: Empuje [press, fondos] y Tirón [remo]
        Routine routine = routine("Fuerza", coach);
        Exercise bench = exerciseWithId("Press banca");
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        RoutineExercise press = withId(routineExercise(bench));
        RoutineExercise dips = withId(routineExercise(bench));
        RoutineExercise row = withId(routineExercise(bench));
        push.addExercise(press);
        push.addExercise(dips);
        pull.addExercise(row);
        givenOwnRoutine(routine);

        // Act: Tirón pasa primero y se renombra, Empuje queda solo con press (con otros parámetros)
        routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(
                day(pull.getId(), "Espalda", exerciseRequestWithOnlyRequired(row.getId(), bench.getId())),
                day(push.getId(), "Empuje", new RoutineExerciseRequest(press.getId(), bench.getId(), 5, 5,
                        null, 120, "rpe8.5", "  "))));

        // Assert: se conservan los objetos (y sus ids), con el nuevo orden
        assertEquals(List.of(pull, push), routine.getDays());
        assertEquals("Espalda", pull.getName());
        assertEquals(1, pull.getDayNumber());
        assertEquals(2, push.getDayNumber());
        assertEquals(List.of(press), push.getExercises());
        assertEquals(5, press.getSets());
        assertEquals(5, press.getReps());
        assertNull(press.getRecommendedWeight());
        assertEquals((short) 120, press.getRest());
        assertEquals("RPE 8.5", press.getRirRpe());
        assertNull(press.getTechniqueNote());

        // El ejercicio del catálogo no cambió: no se vuelve a buscar
        verify(exerciseRepository, never()).findVisibleByIdIn(any(), anyCollection());
        verify(performedSetChecker).hasPerformedSets(Set.of(dips.getId()));
    }

    @Test
    void shouldChangeTheCatalogExerciseOfAnExistingItem() {
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineExercise planned = withId(routineExercise(exerciseWithId("Press banca")));
        push.addExercise(planned);
        Exercise incline = exerciseWithId("Press inclinado");
        givenOwnRoutine(routine);
        givenVisibleExercises(incline);

        routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(
                day(push.getId(), "Empuje", exerciseRequest(planned.getId(), incline.getId()))));

        assertSame(incline, planned.getExercise());
        verify(exerciseRepository).findVisibleByIdIn(COACH_ID, Set.of(incline.getId()));
    }

    @Test
    void shouldRemoveAllTheDaysWithAnEmptyStructure() {
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineExercise planned = withId(routineExercise(exerciseWithId("Press banca")));
        push.addExercise(planned);
        givenOwnRoutine(routine);

        routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure());

        assertTrue(routine.getDays().isEmpty());
        verify(performedSetChecker).hasPerformedSets(Set.of(planned.getId()));
    }

    @Test
    void shouldRejectRemovingExercisesThatHavePerformedSets() {
        // Arrange
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineExercise planned = withId(routineExercise(exerciseWithId("Press banca")));
        push.addExercise(planned);
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));
        when(performedSetChecker.hasPerformedSets(Set.of(planned.getId()))).thenReturn(true);

        // Act + Assert: no se toca nada
        assertThrows(RoutineHasPerformedSetsException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(day(push.getId(), "Empuje"))));
        assertEquals(List.of(planned), push.getExercises());
        verify(routineRepository, never()).flush();
    }

    // ---------- días con sesiones de entrenamiento (US-18) ----------

    @Test
    void shouldRejectRemovingDaysThatHaveTrainingSessions() {
        // Arrange: Empuje y Tirón; Tirón ya se entrenó
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        givenOwnRoutine(routine);
        when(trainingSessionChecker.hasTrainingSessions(Set.of(pull.getId()))).thenReturn(true);

        // Act + Assert: no se toca nada
        RoutineDayHasTrainingSessionsException ex = assertThrows(RoutineDayHasTrainingSessionsException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(day(push.getId(), "Empuje"))));
        assertEquals("No se pueden quitar días que ya tienen entrenamientos registrados. "
                + "Duplique la rutina y edite la copia", ex.getMessage());
        assertEquals(List.of(push, pull), routine.getDays());
        verify(routineRepository, never()).flush();
    }

    @Test
    void shouldAskAboutTrainingSessionsOnlyForTheRemovedDays() {
        // Arrange
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        RoutineDay legs = withId(routine.addDay("Pierna"));
        givenOwnRoutine(routine);

        // Act: queda Pierna (primera) y uno nuevo
        routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(day(legs.getId(), "Pierna"),
                day(null, "Core")));

        // Assert
        verify(trainingSessionChecker).hasTrainingSessions(Set.of(push.getId(), pull.getId()));
        assertEquals(List.of("Pierna", "Core"), routine.getDays().stream().map(RoutineDay::getName).toList());
    }

    @Test
    void shouldNotAskAboutTrainingSessionsWhenNoDayIsRemoved() {
        // Arrange: un día entrenado se puede renombrar y reordenar
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        givenOwnRoutine(routine);

        // Act
        routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(day(pull.getId(), "Espalda"),
                day(push.getId(), "Empuje")));

        // Assert
        verify(trainingSessionChecker, never()).hasTrainingSessions(anyCollection());
        assertEquals(List.of(pull, push), routine.getDays());
        assertEquals("Espalda", pull.getName());
    }

    @Test
    void shouldThrowNotFoundWhenAnExerciseIsNotInTheCoachsCatalog() {
        // Arrange: el repositorio no devuelve los inexistentes, eliminados ni privados de otro entrenador
        Routine routine = routine("Fuerza", coach);
        UUID unknown = UUID.randomUUID();
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));
        when(exerciseRepository.findVisibleByIdIn(COACH_ID, Set.of(unknown))).thenReturn(List.of());

        // Act + Assert
        assertThrows(ExerciseNotFoundException.class, () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID,
                structure(day(null, "Empuje", exerciseRequest(null, unknown)))));
        assertTrue(routine.getDays().isEmpty());
        verify(routineRepository, never()).flush();
    }

    @Test
    void shouldRejectADayIdThatIsNotOfTheRoutine() {
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine("Fuerza", coach)));

        RoutineItemNotInRoutineException ex = assertThrows(RoutineItemNotInRoutineException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID,
                        structure(day(UUID.randomUUID(), "Empuje"))));
        assertEquals("days[0].id", ex.getField());
    }

    @Test
    void shouldRejectAnExerciseIdOfAnotherDay() {
        // Arrange: el ejercicio es de Empuje y se manda dentro de Tirón
        Routine routine = routine("Fuerza", coach);
        Exercise bench = exerciseWithId("Press banca");
        RoutineDay push = withId(routine.addDay("Empuje"));
        RoutineDay pull = withId(routine.addDay("Tirón"));
        RoutineExercise planned = withId(routineExercise(bench));
        push.addExercise(planned);
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));

        // Act + Assert
        RoutineItemNotInRoutineException ex = assertThrows(RoutineItemNotInRoutineException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(
                        day(push.getId(), "Empuje"),
                        day(pull.getId(), "Tirón", exerciseRequest(planned.getId(), bench.getId())))));
        assertEquals("days[1].exercises[0].id", ex.getField());
    }

    @Test
    void shouldRejectAnExerciseIdInsideANewDay() {
        Routine routine = routine("Fuerza", coach);
        Exercise bench = exerciseWithId("Press banca");
        RoutineExercise planned = withId(routineExercise(bench));
        withId(routine.addDay("Empuje")).addExercise(planned);
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));

        RoutineItemNotInRoutineException ex = assertThrows(RoutineItemNotInRoutineException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(
                        day(null, "Nuevo", exerciseRequest(planned.getId(), bench.getId())))));
        assertEquals("days[0].exercises[0].id", ex.getField());
    }

    @Test
    void shouldRejectARepeatedDayId() {
        Routine routine = routine("Fuerza", coach);
        RoutineDay push = withId(routine.addDay("Empuje"));
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));

        RoutineItemNotInRoutineException ex = assertThrows(RoutineItemNotInRoutineException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(
                        day(push.getId(), "Empuje"), day(push.getId(), "Otra vez"))));
        assertEquals("days[1].id", ex.getField());
    }

    @Test
    void shouldDenyChangingTheStructureOfAnotherCoachsRoutine() {
        when(routineRepository.findById(ROUTINE_ID))
                .thenReturn(Optional.of(routine("Fuerza", coachWithId("bruno@test.com", OTHER_COACH_ID))));

        assertThrows(RoutineAccessDeniedException.class,
                () -> routineService.replaceStructure(COACH_ID, ROUTINE_ID, structure(day(null, "Empuje"))));
        verify(routineRepository, never()).flush();
    }

    // ---------- duplicate (US-15) ----------

    @Test
    void shouldDuplicateTheRoutineAsAnIndependentCopy() {
        // Arrange
        Routine original = routine("Fuerza", coach);
        original.addDay("Empuje").addExercise(routineExercise(exerciseWithId("Press banca")));
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(original));
        when(routineRepository.saveAndFlush(any(Routine.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        RoutineDetailResponse response = routineService.duplicate(COACH_ID, ROUTINE_ID);

        // Assert
        Routine copy = captureSaved();
        assertEquals("Copia de Fuerza", copy.getName());
        assertSame(coach, copy.getCoach());
        assertEquals(1, copy.getDays().size());
        assertEquals("Empuje", response.days().get(0).name());
        assertEquals(1, response.days().get(0).exercises().size());
    }

    @Test
    void shouldNumberTheCopyWhenTheNameIsAlreadyUsed() {
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine("Fuerza", coach)));
        when(routineRepository.existsByCoachIdAndNameIgnoreCase(COACH_ID, "Copia de Fuerza")).thenReturn(true);
        when(routineRepository.existsByCoachIdAndNameIgnoreCase(COACH_ID, "Copia de Fuerza (2)")).thenReturn(true);
        when(routineRepository.saveAndFlush(any(Routine.class))).thenAnswer(inv -> inv.getArgument(0));

        routineService.duplicate(COACH_ID, ROUTINE_ID);

        assertEquals("Copia de Fuerza (3)", captureSaved().getName());
    }

    @Test
    void shouldDenyDuplicatingAnotherCoachsRoutine() {
        when(routineRepository.findById(ROUTINE_ID))
                .thenReturn(Optional.of(routine("Fuerza", coachWithId("bruno@test.com", OTHER_COACH_ID))));

        assertThrows(RoutineAccessDeniedException.class, () -> routineService.duplicate(COACH_ID, ROUTINE_ID));
        verify(routineRepository, never()).saveAndFlush(any());
    }

    @Test
    void copyNameShouldTruncateTheOriginalSoTheSuffixFitsIn100Characters() {
        String longName = "a".repeat(100);

        String first = RoutineService.copyName(longName, 1);
        String tenth = RoutineService.copyName(longName, 10);

        assertEquals(100, first.length());
        assertTrue(first.startsWith(RoutineService.COPY_PREFIX));
        assertEquals(100, tenth.length());
        assertTrue(tenth.endsWith(" (10)"));
    }

    @Test
    void normalizeRirRpeShouldUppercaseAndLeaveOneSpace() {
        assertEquals("RIR 2", RoutineService.normalizeRirRpe(" rir2 "));
        assertEquals("RPE 8.5", RoutineService.normalizeRirRpe("RPE   8.5"));
        assertNull(RoutineService.normalizeRirRpe("  "));
        assertNull(RoutineService.normalizeRirRpe(null));
    }

    private void givenOwnRoutine(Routine routine) {
        when(routineRepository.findById(ROUTINE_ID)).thenReturn(Optional.of(routine));
    }

    private void givenVisibleExercises(Exercise... exercises) {
        when(exerciseRepository.findVisibleByIdIn(eq(COACH_ID), anyCollection())).thenAnswer(inv -> {
            Collection<UUID> ids = inv.getArgument(1);
            return List.of(exercises).stream().filter(e -> ids.contains(e.getId())).toList();
        });
    }

    private static Exercise exerciseWithId(String name) {
        return withId(exercise(name, MuscleGroup.CHEST, null));
    }

    private static <T> T withId(T entity) {
        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
        return entity;
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
