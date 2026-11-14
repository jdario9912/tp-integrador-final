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
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
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
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Series registradas (US-19, V11): claves únicas, checks de DONE y SKIPPED, claves foráneas sin cascada y las
// consultas del registro, del checker de la rutina y del bloqueo de la sesión. Los datos de la base se leen tras
// vaciar el contexto de persistencia, así lo que se verifica sale de la consulta y no de las entidades en memoria
class PerformedSetRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    @Autowired
    private PerformedSetRepository performedSetRepository;

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

    private Athlete leo;

    private Athlete mia;

    private RoutineDay upper;

    private RoutineDay lower;

    // Press (sortOrder 0) y remo (sortOrder 1) del día Torso; sentadilla del día Pierna
    private RoutineExercise press;

    private RoutineExercise row;

    private RoutineExercise squat;

    private RoutineAssignment leoAssignment;

    private RoutineAssignment miaAssignment;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise remo = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, ana));
        Exercise squatExercise = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana));

        Routine strength = routine("Fuerza", ana);
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(routineExercise(remo));
        lower = strength.addDay("Pierna");
        lower.addExercise(routineExercise(squatExercise));
        strength = routineRepository.saveAndFlush(strength);
        upper = strength.getDays().get(0);
        lower = strength.getDays().get(1);
        press = upper.getExercises().get(0);
        row = upper.getExercises().get(1);
        squat = lower.getExercises().get(0);

        leoAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength, NOV_3));
        miaAssignment = routineAssignmentRepository.saveAndFlush(assignment(mia, strength, NOV_3));
    }

    // ---------- claves y checks de la base ----------

    @Test
    void shouldAllowOneSetPerSessionExerciseAndNumber() {
        TrainingSession session = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        performedSetRepository.saveAndFlush(done(session, press, 1));

        // Mismo ejercicio y serie, en la misma sesión: la clave única lo rechaza
        assertThrows(DataIntegrityViolationException.class,
                () -> performedSetRepository.saveAndFlush(done(session, press, 1)));
    }

    @Test
    void shouldAllowTheSameSetNumberOfAnotherExercise() {
        TrainingSession session = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        performedSetRepository.saveAndFlush(done(session, press, 1));

        performedSetRepository.saveAndFlush(done(session, row, 1));

        assertEquals(2, performedSetRepository.count());
    }

    // Cada caso en su propio test: un error de SQL aborta la transacción de la prueba
    @Test
    void shouldRejectADoneSetWithoutWeight() {
        PerformedSet set = performedSetRepository.saveAndFlush(done(sessionOf(leoAssignment), press, 1));

        // ck_performed_sets_done: la base no admite una realizada sin peso
        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "update performed_sets set weight_kg = null where id = ?", set.getId()));
    }

    @Test
    void shouldRejectASkippedSetThatKeepsItsWeight() {
        PerformedSet set = performedSetRepository.saveAndFlush(skipped(sessionOf(leoAssignment), press, 1));

        // ck_performed_sets_skipped: una omitida no guarda peso
        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "update performed_sets set weight_kg = 60 where id = ?", set.getId()));
    }

    @Test
    void shouldRejectASetNumberBelowOne() {
        PerformedSet set = performedSetRepository.saveAndFlush(done(sessionOf(leoAssignment), press, 1));

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "update performed_sets set set_number = 0 where id = ?", set.getId()));
    }

    @Test
    void shouldRejectAStatusOutsideTheCatalog() {
        PerformedSet set = performedSetRepository.saveAndFlush(done(sessionOf(leoAssignment), press, 1));

        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "update performed_sets set status_id = 9 where id = ?", set.getId()));
    }

    @Test
    void shouldNotDeleteAnExerciseThatHasSets() {
        performedSetRepository.saveAndFlush(done(sessionOf(leoAssignment), press, 1));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("delete from routine_exercises where id = ?", press.getId()));
    }

    @Test
    void shouldStoreTheStatusesOfTheCatalog() {
        TrainingSession session = sessionOf(leoAssignment);
        performedSetRepository.saveAndFlush(done(session, press, 1));
        performedSetRepository.saveAndFlush(skipped(session, press, 2));
        entityManager.clear();

        List<Integer> ids = jdbcTemplate.queryForList(
                "select status_id from performed_sets order by set_number", Integer.class);

        assertEquals(List.of(1, 2), ids);
    }

    // ---------- consultas ----------

    @Test
    void shouldTellWhetherAnyOfTheExercisesHasSets() {
        performedSetRepository.saveAndFlush(done(sessionOf(leoAssignment), press, 1));

        assertTrue(performedSetRepository.existsByRoutineExerciseIdIn(Set.of(squat.getId(), press.getId())));
        assertFalse(performedSetRepository.existsByRoutineExerciseIdIn(Set.of(squat.getId(), row.getId())));
    }

    @Test
    void shouldFindTheSetOfItsKey() {
        TrainingSession session = sessionOf(leoAssignment);
        PerformedSet saved = performedSetRepository.saveAndFlush(done(session, press, 2));
        entityManager.clear();

        assertEquals(saved.getId(), performedSetRepository
                .findByTrainingSessionIdAndRoutineExerciseIdAndSetNumber(session.getId(), press.getId(), (short) 2)
                .orElseThrow().getId());
        assertTrue(performedSetRepository
                .findByTrainingSessionIdAndRoutineExerciseIdAndSetNumber(session.getId(), press.getId(), (short) 1)
                .isEmpty());
    }

    @Test
    void shouldListTheSetsOfTheSessionByExerciseOrderAndSetNumber() {
        // Arrange: las series entran desordenadas; una serie de otra sesión de Leo no aparece
        TrainingSession session = sessionOf(leoAssignment);
        performedSetRepository.saveAndFlush(done(session, row, 1));
        performedSetRepository.saveAndFlush(done(session, press, 2));
        performedSetRepository.saveAndFlush(skipped(session, press, 1));
        TrainingSession otherSession = trainingSessionRepository.saveAndFlush(session(miaAssignment, upper, NOV_11));
        performedSetRepository.saveAndFlush(done(otherSession, press, 1));
        entityManager.clear();

        // Act
        List<PerformedSet> sets = performedSetRepository.findBySessionInOrder(session.getId());

        // Assert: por sortOrder del ejercicio (press antes que remo) y luego por número de serie
        assertEquals(List.of(press.getId(), press.getId(), row.getId()),
                sets.stream().map(set -> set.getRoutineExercise().getId()).toList());
        assertEquals(List.of((short) 1, (short) 2, (short) 1),
                sets.stream().map(PerformedSet::getSetNumber).toList());
        assertEquals(SetStatus.SKIPPED, sets.get(0).getStatus());
    }

    @Test
    void shouldReturnNoSetsForASessionWithoutThem() {
        TrainingSession session = sessionOf(leoAssignment);

        assertTrue(performedSetRepository.findBySessionInOrder(session.getId()).isEmpty());
    }

    // ---------- bloqueo de la sesión ----------

    @Test
    void shouldLockOnlyTheSessionOfTheAthleteThatAsksForIt() {
        TrainingSession session = trainingSessionRepository.saveAndFlush(session(leoAssignment, upper, NOV_11));
        entityManager.clear();

        // Act + Assert: la de Leo para Leo; la misma para Mía, y un id inexistente, no
        assertEquals(session.getId(), trainingSessionRepository
                .findByIdAndAthleteIdForUpdate(session.getId(), leo.getId()).orElseThrow().getId());
        assertTrue(trainingSessionRepository.findByIdAndAthleteIdForUpdate(session.getId(), mia.getId()).isEmpty());
        assertTrue(trainingSessionRepository.findByIdAndAthleteIdForUpdate(UUID.randomUUID(), leo.getId()).isEmpty());
    }

    // ---------- helpers ----------

    private TrainingSession sessionOf(RoutineAssignment assignment) {
        return trainingSessionRepository.saveAndFlush(session(assignment, upper, NOV_11));
    }

    private static PerformedSet done(TrainingSession session, RoutineExercise exercise, int setNumber) {
        PerformedSet set = new PerformedSet(session, exercise, (short) setNumber);
        set.markDone(new BigDecimal("60"), 8, null);
        return set;
    }

    private static PerformedSet skipped(TrainingSession session, RoutineExercise exercise, int setNumber) {
        PerformedSet set = new PerformedSet(session, exercise, (short) setNumber);
        set.markSkipped("Sin tiempo");
        return set;
    }
}
