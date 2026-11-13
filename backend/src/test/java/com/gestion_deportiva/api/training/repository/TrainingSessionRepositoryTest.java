package com.gestion_deportiva.api.training.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import jakarta.persistence.EntityManager;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.middayInArgentina;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Sesiones de entrenamiento (US-18): índice único parcial de la sesión en progreso, claves foráneas sin cascada y
// lecturas sin N+1. Los tests de lectura vacían el contexto de persistencia antes de consultar: así lo que se lee sale
// de la consulta y no de las entidades que quedaron en memoria
class TrainingSessionRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    @Autowired
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Routine strength;

    // Torso (press, remo), Pierna (sentadilla) y Movilidad (sin ejercicios)
    private RoutineDay upper;

    private RoutineDay lower;

    private RoutineDay mobility;

    // Leo y Mía tienen asignada la misma rutina
    private RoutineAssignment leoAssignment;

    private RoutineAssignment miaAssignment;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        Athlete mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
        // Ejercicios propios del entrenador: no chocan con los globales precargados por la V3
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise row = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, ana));
        Exercise squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana));

        strength = routine("Fuerza", ana);
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(routineExercise(row));
        lower = strength.addDay("Pierna");
        lower.addExercise(routineExercise(squat));
        mobility = strength.addDay("Movilidad");
        strength = routineRepository.saveAndFlush(strength);

        leoAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength, NOV_3));
        miaAssignment = routineAssignmentRepository.saveAndFlush(assignment(mia, strength, NOV_3));
    }

    // ---------- una sola sesión en progreso por atleta ----------

    @Test
    void shouldRejectASecondSessionInProgressForTheSameAthlete() {
        // Arrange
        trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));

        // Act + Assert: ux_training_sessions_athlete_in_progress, aunque sea otro día
        assertThrows(DataIntegrityViolationException.class,
                () -> trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11)));
    }

    @Test
    void shouldAllowOneSessionInProgressPerAthlete() {
        trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        trainingSessionRepository.saveAndFlush(session(miaAssignment, upper, NOV_11));

        assertEquals(2, trainingSessionRepository.count());
    }

    @Test
    void shouldAllowANewSessionInProgressOnceThePreviousOneIsNoLongerInProgress() {
        // Arrange: US-18 no finaliza sesiones (US-20); se simula cambiando el estado en la base
        TrainingSession finished = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        jdbcTemplate.update("update training_sessions set status_id = ? where id = ?",
                SessionStatus.FINISHED.getId(), finished.getId());

        // Act
        trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));

        // Assert
        assertEquals(2, trainingSessionRepository.count());
    }

    // ---------- claves foráneas sin cascada ----------

    @Test
    void shouldNotDeleteADayThatHasSessions() {
        trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("delete from routine_days where id = ?", lower.getId()));
    }

    @Test
    void shouldNotDeleteAnAssignmentThatHasSessions() {
        trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("delete from routine_assignments where id = ?", leoAssignment.getId()));
    }

    @Test
    void shouldStillDeleteADayWithoutSessions() {
        trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));

        assertEquals(1, jdbcTemplate.update("delete from routine_days where id = ?", mobility.getId()));
    }

    // ---------- consultas de existencia ----------

    @Test
    void shouldTellWhetherTheAthleteHasASessionInProgress() {
        trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));

        assertTrue(trainingSessionRepository.existsByAthleteIdAndStatus(leoAssignment.getAthlete().getId(),
                SessionStatus.IN_PROGRESS));
        assertFalse(trainingSessionRepository.existsByAthleteIdAndStatus(miaAssignment.getAthlete().getId(),
                SessionStatus.IN_PROGRESS));
        assertFalse(trainingSessionRepository.existsByAthleteIdAndStatus(leoAssignment.getAthlete().getId(),
                SessionStatus.FINISHED));
    }

    @Test
    void shouldTellWhetherAnyOfTheDaysHasSessions() {
        trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));

        assertTrue(trainingSessionRepository.existsByRoutineDayIdIn(Set.of(lower.getId(), UUID.randomUUID())));
        assertFalse(trainingSessionRepository.existsByRoutineDayIdIn(Set.of(upper.getId(), mobility.getId())));
    }

    // ---------- lecturas con todo cargado ----------

    @Test
    void shouldFindTheDetailWithTheAssignmentTheRoutineAndTheDayWithItsExercisesLoaded() {
        // Arrange
        TrainingSession saved = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        entityManager.clear();

        // Act
        TrainingSession found = trainingSessionRepository
                .findDetail(leoAssignment.getAthlete().getId(), saved.getId()).orElseThrow();

        // Assert: datos de la sesión
        assertEquals(SessionStatus.IN_PROGRESS, found.getStatus());
        assertEquals(NOV_11, found.getSessionDate());
        assertEquals(middayInArgentina(NOV_11), found.getStartedAt());

        // Assert: todo lo que lee la respuesta ya viene cargado (sin N+1), con los ejercicios por sortOrder
        assertTrue(Hibernate.isInitialized(found.getAssignment()));
        assertTrue(Hibernate.isInitialized(found.getAssignment().getRoutine()));
        assertEquals("Fuerza", found.getAssignment().getRoutine().getName());
        RoutineDay day = found.getRoutineDay();
        assertTrue(Hibernate.isInitialized(day));
        assertTrue(Hibernate.isInitialized(ReflectionTestUtils.getField(day, "exercises")));
        assertEquals(List.of("Press banca", "Remo bajo"), exerciseNames(day));
        assertEquals(List.of((short) 0, (short) 1),
                day.getExercises().stream().map(RoutineExercise::getSortOrder).toList());
        day.getExercises().forEach(exercise -> assertTrue(Hibernate.isInitialized(exercise.getExercise())));
    }

    @Test
    void shouldNotFindTheSessionOfAnotherAthleteNorAnUnknownOne() {
        // Arrange
        TrainingSession leoSession = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        entityManager.clear();

        // Act + Assert
        assertTrue(trainingSessionRepository.findDetail(miaAssignment.getAthlete().getId(), leoSession.getId())
                .isEmpty());
        assertTrue(trainingSessionRepository.findDetail(leoAssignment.getAthlete().getId(), UUID.randomUUID())
                .isEmpty());
    }

    @Test
    void shouldFindADayWithoutExercisesWithAnEmptyList() {
        // Arrange: el service no lo permite (422), pero el left join no tiene que perder la sesión
        TrainingSession saved = trainingSessionRepository.saveAndFlush(session(leoAssignment, mobility, NOV_11));
        entityManager.clear();

        // Act
        TrainingSession found = trainingSessionRepository
                .findDetail(leoAssignment.getAthlete().getId(), saved.getId()).orElseThrow();

        // Assert
        assertEquals("Movilidad", found.getRoutineDay().getName());
        assertTrue(found.getRoutineDay().getExercises().isEmpty());
    }

    @Test
    void shouldFindOnlyTheSessionInProgressOfTheAthlete() {
        // Arrange: Leo tiene una que ya no está en progreso y otra en progreso; Mía, ninguna
        TrainingSession finished = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        jdbcTemplate.update("update training_sessions set status_id = ? where id = ?",
                SessionStatus.FINISHED.getId(), finished.getId());
        TrainingSession inProgress = trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));
        entityManager.clear();

        // Act
        TrainingSession found = trainingSessionRepository
                .findDetailByAthleteIdAndStatus(leoAssignment.getAthlete().getId(), SessionStatus.IN_PROGRESS)
                .orElseThrow();

        // Assert
        assertEquals(inProgress.getId(), found.getId());
        assertEquals(List.of("Sentadilla"), exerciseNames(found.getRoutineDay()));
        assertTrue(Hibernate.isInitialized(ReflectionTestUtils.getField(found.getRoutineDay(), "exercises")));
        assertTrue(trainingSessionRepository
                .findDetailByAthleteIdAndStatus(miaAssignment.getAthlete().getId(), SessionStatus.IN_PROGRESS)
                .isEmpty());
    }

    private static List<String> exerciseNames(RoutineDay day) {
        return day.getExercises().stream().map(exercise -> exercise.getExercise().getName()).toList();
    }
}
