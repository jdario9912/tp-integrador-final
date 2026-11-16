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
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.middayInArgentina;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Historial y revisión (US-21, contrato 15): el filtro y el orden del historial, la página, el detalle que trae la
// rutina y el día en una consulta, el resumen agregado de la página y las restricciones de V15 (reviewed_at y la
// observación). Los datos de cada test se revierten al final (AbstractIntegrationTest)
class TrainingSessionHistoryRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_4 = LocalDate.of(2026, 11, 4);
    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);
    private static final Instant REVIEWED_AT = Instant.parse("2026-11-12T12:00:00.123456789Z");
    // Estados de las series (V11): DONE = 1 y SKIPPED = 2
    private static final short DONE = 1;
    private static final short SKIPPED = 2;

    @Autowired
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private PerformedSetRepository performedSetRepository;

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

    // Torso: press (4 series) y remo (3 series), total 7. Pierna: sentadilla (4). Movilidad: sin ejercicios
    private RoutineDay upper;

    private RoutineDay lower;

    private RoutineDay mobility;

    private RoutineExercise bench;

    private RoutineExercise row;

    private RoutineAssignment leoAssignment;

    private RoutineAssignment miaAssignment;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        Athlete mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
        Exercise benchPress = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise remo = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, ana));
        Exercise squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana));

        Routine strength = routine("Fuerza", ana);
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(benchPress));
        upper.addExercise(RoutineExercise.builder().exercise(remo).sets((short) 3).reps((short) 12).build());
        lower = strength.addDay("Pierna");
        lower.addExercise(routineExercise(squat));
        mobility = strength.addDay("Movilidad");
        strength = routineRepository.saveAndFlush(strength);

        bench = upper.getExercises().get(0);
        row = upper.getExercises().get(1);
        leoAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength, NOV_3));
        miaAssignment = routineAssignmentRepository.saveAndFlush(assignment(mia, strength, NOV_3));
    }

    // ---------- historial: sesiones cerradas, orden, filtro y página ----------

    @Test
    void shouldListOnlyTheClosedSessionsOfTheAthleteNewestFirst() {
        // Arrange: Leo tiene una finalizada (3/11), una cancelada (11/11) y una en progreso (no entra); Mía, otra
        TrainingSession finished = finishedOn(leoAssignment, upper, NOV_3, middayInArgentina(NOV_3));
        TrainingSession cancelled = cancelledOn(leoAssignment, lower, NOV_11, middayInArgentina(NOV_11));
        inProgressOn(leoAssignment, mobility, NOV_11);
        finishedOn(miaAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        entityManager.clear();

        // Act
        Page<TrainingSession> page = trainingSessionRepository.findHistory(leoAssignment.getAthlete().getId(), null,
                null, PageRequest.of(0, 20));

        // Assert
        assertEquals(List.of(cancelled.getId(), finished.getId()), idsOf(page));
        assertEquals(2, page.getTotalElements());
    }

    @Test
    void shouldOrderSameDaySessionsByStartTimeAndThenByIdDescending() {
        // Arrange: dos del mismo día a distinta hora y dos a la misma hora (desempata el id)
        TrainingSession earlier = finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        TrainingSession later = finishedOn(leoAssignment, lower, NOV_11, middayInArgentina(NOV_11).plusSeconds(3600));
        TrainingSession tieA = finishedOn(leoAssignment, upper, NOV_4, middayInArgentina(NOV_4));
        TrainingSession tieB = finishedOn(leoAssignment, lower, NOV_4, middayInArgentina(NOV_4));
        entityManager.clear();

        // Act
        Page<TrainingSession> page = trainingSessionRepository.findHistory(leoAssignment.getAthlete().getId(), null,
                null, PageRequest.of(0, 20));

        // Assert: 11/11 antes que 4/11; dentro de 11/11, la hora más tarde primero; a igual hora, id descendente
        // PostgreSQL ordena los uuid byte a byte sin signo; UUID.compareTo de Java compara con signo y a veces
        // da el orden inverso. El texto en minúsculas sigue el mismo orden que la base
        List<UUID> tiesById = Stream.of(tieA.getId(), tieB.getId())
                .sorted(Comparator.comparing(UUID::toString, Comparator.reverseOrder())).toList();
        assertEquals(List.of(later.getId(), earlier.getId(), tiesById.get(0), tiesById.get(1)), idsOf(page));
    }

    @Test
    void shouldFilterByTheInclusiveSessionDateRange() {
        finishedOn(leoAssignment, upper, NOV_3, middayInArgentina(NOV_3));
        finishedOn(leoAssignment, lower, NOV_4, middayInArgentina(NOV_4));
        finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        UUID athleteId = leoAssignment.getAthlete().getId();
        entityManager.clear();

        // Act + Assert: solo desde, solo hasta y los dos límites incluidos
        assertEquals(2, trainingSessionRepository.findHistory(athleteId, NOV_4, null, PageRequest.of(0, 20))
                .getTotalElements());
        assertEquals(2, trainingSessionRepository.findHistory(athleteId, null, NOV_4, PageRequest.of(0, 20))
                .getTotalElements());
        assertEquals(1, trainingSessionRepository.findHistory(athleteId, NOV_3, NOV_3, PageRequest.of(0, 20))
                .getTotalElements());
        assertEquals(3, trainingSessionRepository.findHistory(athleteId, NOV_3, NOV_11, PageRequest.of(0, 20))
                .getTotalElements());
    }

    @Test
    void shouldPageTheHistoryWithTheTotalCount() {
        finishedOn(leoAssignment, upper, NOV_3, middayInArgentina(NOV_3));
        finishedOn(leoAssignment, lower, NOV_4, middayInArgentina(NOV_4));
        finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        entityManager.clear();

        // Act: segunda página de a dos
        Page<TrainingSession> page = trainingSessionRepository.findHistory(leoAssignment.getAthlete().getId(), null,
                null, PageRequest.of(1, 2));

        // Assert
        assertEquals(1, page.getContent().size());
        assertEquals(3, page.getTotalElements());
        assertEquals(2, page.getTotalPages());
        assertEquals(NOV_3, page.getContent().get(0).getSessionDate());
    }

    @Test
    void shouldFetchTheRoutineAndTheDayOfThePageInOneQuery() {
        // Arrange
        TrainingSession finished = finishedOn(leoAssignment, upper, NOV_3, middayInArgentina(NOV_3));
        entityManager.clear();
        List<UUID> ids = List.of(finished.getId());

        // Act
        List<TrainingSession> details = trainingSessionRepository.findHistoryDetails(ids);

        // Assert: la rutina y el día ya vienen cargados (sin consultas por cada sesión)
        assertEquals(1, details.size());
        TrainingSession found = details.get(0);
        assertTrue(Hibernate.isInitialized(found.getAssignment()));
        assertTrue(Hibernate.isInitialized(found.getAssignment().getRoutine()));
        assertTrue(Hibernate.isInitialized(found.getRoutineDay()));
        assertEquals("Fuerza", found.getAssignment().getRoutine().getName());
        assertEquals("Torso", found.getRoutineDay().getName());
    }

    // ---------- resumen agregado de la página ----------

    @Test
    void shouldSummarizeEverySessionOfThePageInOneQuery() {
        // Arrange: Leo finaliza el torso con 2 series de press realizadas, 1 omitida y 1 de remo realizada: 7
        // prescritas, 3 realizadas, 1 omitida, volumen 600 + 500 + 480 = 1580
        TrainingSession torso = finishedOn(leoAssignment, upper, NOV_3, middayInArgentina(NOV_3));
        performedSetRepository.saveAndFlush(done(torso, bench, 1, "60", 10));
        performedSetRepository.saveAndFlush(done(torso, bench, 2, "62.5", 8));
        performedSetRepository.saveAndFlush(skipped(torso, bench, 3));
        performedSetRepository.saveAndFlush(done(torso, row, 1, "40", 12));
        // Cancelada sin series: el día de la pierna prescribe 4 y no hay volumen
        TrainingSession legs = cancelledOn(leoAssignment, lower, NOV_11, middayInArgentina(NOV_11));
        // Día sin ejercicios: prescribe 0 (coalesce)
        TrainingSession rest = finishedOn(leoAssignment, mobility, NOV_11, middayInArgentina(NOV_11).plusSeconds(60));
        // Otra atleta con series: no tienen que colarse en las cuentas de Leo
        TrainingSession miaSession = finishedOn(miaAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        performedSetRepository.saveAndFlush(done(miaSession, bench, 1, "50", 5));
        entityManager.clear();

        // Act
        List<Object[]> rows = trainingSessionRepository.findSummaryRows(
                List.of(torso.getId(), legs.getId(), rest.getId()), DONE, SKIPPED);

        // Assert: una fila por sesión de la página, sin filas de la otra atleta
        Map<UUID, Object[]> byId = rows.stream()
                .collect(Collectors.toMap(r -> UUID.fromString(r[0].toString()), r -> r));
        assertEquals(3, rows.size());

        Object[] tor = byId.get(torso.getId());
        assertEquals(7L, ((Number) tor[1]).longValue());
        assertEquals(3L, ((Number) tor[2]).longValue());
        assertEquals(1L, ((Number) tor[3]).longValue());
        assertEquals(0, new BigDecimal(tor[4].toString()).compareTo(new BigDecimal("1580")));

        Object[] pierna = byId.get(legs.getId());
        assertEquals(4L, ((Number) pierna[1]).longValue());
        assertEquals(0L, ((Number) pierna[2]).longValue());
        assertEquals(0L, ((Number) pierna[3]).longValue());
        assertEquals(0, new BigDecimal(pierna[4].toString()).compareTo(BigDecimal.ZERO));

        Object[] descanso = byId.get(rest.getId());
        assertEquals(0L, ((Number) descanso[1]).longValue());
        assertEquals(0L, ((Number) descanso[2]).longValue());
    }

    // ---------- V15: revisión y observación ----------

    @Test
    void shouldPersistTheReviewAtMicrosecondsWithItsObservation() {
        // Arrange
        TrainingSession finished = finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        finished.review(REVIEWED_AT, "Buen trabajo");
        trainingSessionRepository.saveAndFlush(finished);
        entityManager.clear();

        // Act
        TrainingSession found = trainingSessionRepository.findById(finished.getId()).orElseThrow();

        // Assert
        assertTrue(found.isReviewed());
        assertEquals(Instant.parse("2026-11-12T12:00:00.123456Z"), found.getReviewedAt());
        assertEquals("Buen trabajo", found.getCoachObservation());
    }

    @Test
    void shouldReplaceTheReviewWhenReviewedAgain() {
        TrainingSession finished = finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        finished.review(REVIEWED_AT, "Primera");
        trainingSessionRepository.saveAndFlush(finished);
        finished.review(REVIEWED_AT.plusSeconds(60), null);
        trainingSessionRepository.saveAndFlush(finished);
        entityManager.clear();

        TrainingSession found = trainingSessionRepository.findById(finished.getId()).orElseThrow();

        assertEquals(Instant.parse("2026-11-12T12:01:00.123456Z"), found.getReviewedAt());
        assertNull(found.getCoachObservation());
    }

    @Test
    void shouldRejectAReviewOfASessionThatIsNotFinished() {
        // Arrange: en progreso
        TrainingSession inProgress = inProgressOn(leoAssignment, upper, NOV_11);

        // Act + Assert: ck_training_sessions_reviewed_at (solo las FINISHED se revisan)
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("update training_sessions set reviewed_at = now() where id = ?",
                        inProgress.getId()));
    }

    @Test
    void shouldRejectAReviewOfACancelledSession() {
        TrainingSession cancelled = cancelledOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("update training_sessions set reviewed_at = now() where id = ?",
                        cancelled.getId()));
    }

    @Test
    void shouldRejectAnObservationWithoutAReview() {
        // Arrange: finalizada y sin revisar
        TrainingSession finished = finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));

        // Act + Assert: ck_training_sessions_coach_observation (una observación siempre tiene una revisión)
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("update training_sessions set coach_observation = 'Bien' where id = ?",
                        finished.getId()));
    }

    @Test
    void shouldAcceptAnObservationOfExactlyAThousandCharactersAndRejectOneMore() {
        TrainingSession finished = finishedOn(leoAssignment, upper, NOV_11, middayInArgentina(NOV_11));
        finished.review(REVIEWED_AT, null);
        trainingSessionRepository.saveAndFlush(finished);

        // Act + Assert: varchar(1000)
        assertEquals(1, jdbcTemplate.update("update training_sessions set coach_observation = ? where id = ?",
                "a".repeat(1000), finished.getId()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("update training_sessions set coach_observation = ? where id = ?",
                        "a".repeat(1001), finished.getId()));
    }

    @Test
    void shouldIndexTheHistoryByAthleteAndSessionDateDescending() {
        // Act
        String definition = jdbcTemplate.queryForObject(
                "select indexdef from pg_indexes where indexname = 'ix_training_sessions_athlete_history'",
                String.class);

        // Assert
        assertTrue(definition.contains("(athlete_id, session_date DESC)"), definition);
    }

    // ---------- helpers ----------

    private static List<UUID> idsOf(Page<TrainingSession> page) {
        return page.getContent().stream().map(TrainingSession::getId).toList();
    }

    private TrainingSession finishedOn(RoutineAssignment assignment, RoutineDay day, LocalDate date,
                                       Instant startedAt) {
        TrainingSession session = TrainingSession.start(assignment, day, startedAt, date);
        session.finish(startedAt.plusSeconds(2700));
        return trainingSessionRepository.saveAndFlush(session);
    }

    private TrainingSession cancelledOn(RoutineAssignment assignment, RoutineDay day, LocalDate date,
                                        Instant startedAt) {
        TrainingSession session = TrainingSession.start(assignment, day, startedAt, date);
        session.cancel(startedAt.plusSeconds(900));
        return trainingSessionRepository.saveAndFlush(session);
    }

    private TrainingSession inProgressOn(RoutineAssignment assignment, RoutineDay day, LocalDate date) {
        return trainingSessionRepository.saveAndFlush(session(assignment, day, date));
    }

    private PerformedSet done(TrainingSession session, RoutineExercise exercise, int setNumber, String weight,
                              int reps) {
        PerformedSet set = new PerformedSet(session, exercise, (short) setNumber);
        set.markDone(new BigDecimal(weight), reps, null);
        return set;
    }

    private PerformedSet skipped(TrainingSession session, RoutineExercise exercise, int setNumber) {
        PerformedSet set = new PerformedSet(session, exercise, (short) setNumber);
        set.markSkipped("Molestia en el hombro");
        return set;
    }
}
