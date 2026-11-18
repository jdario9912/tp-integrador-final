package com.gestion_deportiva.api.dashboard.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import com.gestion_deportiva.api.weight.repository.WeightRecordRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.middayInArgentina;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecord;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-11 · Consultas agregadas del dashboard del entrenador. La cartera de Ana: Leo y Mía (activos), Teo (desactivado)
// y Bruno (eliminado). Ciro es de otro entrenador. Los tests vacían el contexto antes de leer
class CoachDashboardRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);

    @Autowired
    private CoachDashboardRepository coachDashboardRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Autowired
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private WeightRecordRepository weightRecordRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    private Coach ana;

    private Athlete leo;

    private Athlete mia;

    private Athlete teo;

    private Athlete bruno;

    private Athlete ciro;

    private Routine openEnded;

    @BeforeEach
    void setUp() {
        ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach eva = coachRepository.saveAndFlush(coach("eva@test.com"));
        mia = athleteRepository.saveAndFlush(new Athlete("Mía", "Sosa", "mia@test.com", PASSWORD_HASH, ana));
        leo = athleteRepository.saveAndFlush(new Athlete("Leo", "Gil", "leo@test.com", PASSWORD_HASH, ana));
        teo = athleteRepository.saveAndFlush(new Athlete("Teo", "Ruiz", "teo@test.com", PASSWORD_HASH, ana));
        teo.deactivate();
        bruno = athleteRepository.saveAndFlush(new Athlete("Bruno", "Diaz", "bruno@test.com", PASSWORD_HASH, ana));
        bruno.markDeleted(Instant.parse("2026-11-10T12:00:00Z"));
        ciro = athleteRepository.saveAndFlush(new Athlete("Ciro", "Alba", "ciro@test.com", PASSWORD_HASH, eva));
        athleteRepository.saveAllAndFlush(List.of(teo, bruno));

        openEnded = routine("Fuerza", ana);
        openEnded.addDay("Torso");
        openEnded = routineRepository.saveAndFlush(openEnded);
    }

    // ---------- activos ----------

    @Test
    void shouldListOnlyTheActiveAthletesOfTheCoachOrderedBySurname() {
        List<DashboardAthleteRow> rows = read(() -> coachDashboardRepository.findActiveAthletes(ana.getId()));

        assertEquals(List.of(leo.getId(), mia.getId()), ids(rows));
        assertEquals("Leo", rows.get(0).getFirstName());
        assertEquals("Gil", rows.get(0).getLastName());
    }

    @Test
    void shouldReturnNothingForACoachWithoutAthletes() {
        Coach empty = coachRepository.saveAndFlush(coach("sin@test.com"));

        assertTrue(read(() -> coachDashboardRepository.findActiveAthletes(empty.getId())).isEmpty());
        assertTrue(read(() -> coachDashboardRepository.findAthletesWithoutRoutine(empty.getId(), TODAY)).isEmpty());
        assertTrue(read(() -> coachDashboardRepository.findPendingReviews(empty.getId(),
                SessionStatus.FINISHED.getId())).isEmpty());
        assertTrue(read(() -> coachDashboardRepository.findAthletesWithoutRecentWeight(empty.getId(), TODAY))
                .isEmpty());
    }

    // ---------- sin rutina ----------

    @Test
    void shouldCountAsWithoutRoutineTheAthletesWithoutAnActiveAssignment() {
        // Arrange: Leo tiene una rutina sin duración (no vence); Mía solo una inactiva del historial
        routineAssignmentRepository.saveAndFlush(assignment(leo, openEnded, TODAY.minusYears(1)));
        RoutineAssignment old = assignment(mia, openEnded, TODAY.minusMonths(2));
        old.deactivate();
        routineAssignmentRepository.saveAndFlush(old);

        // Act + Assert: los inactivos, eliminados y de otro entrenador no cuentan
        assertEquals(List.of(mia.getId()), ids(read(() ->
                coachDashboardRepository.findAthletesWithoutRoutine(ana.getId(), TODAY))));
    }

    @Test
    void shouldCountAnExpiredActiveAssignmentAsWithoutRoutineAndKeepItsLastDayAsValid() {
        // Arrange: 2 semanas → el último día vigente es assignment_date + 13
        Routine twoWeeks = routineRepository.saveAndFlush(Routine.builder().name("Corta").coach(ana)
                .durationWeeks((short) 2).build());
        routineAssignmentRepository.saveAndFlush(assignment(leo, twoWeeks, TODAY.minusDays(13)));
        routineAssignmentRepository.saveAndFlush(assignment(mia, twoWeeks, TODAY.minusDays(14)));

        // Act + Assert: hoy es el último día de Leo (vigente); la de Mía venció ayer
        assertEquals(List.of(mia.getId()), ids(read(() ->
                coachDashboardRepository.findAthletesWithoutRoutine(ana.getId(), TODAY))));
    }

    // ---------- sesiones pendientes de revisar ----------

    @Test
    void shouldCountTheFinishedSessionsNotReviewedPerAthlete() {
        // Arrange: Leo tiene 2 finalizadas sin revisar, 1 revisada, 1 cancelada y 1 en progreso; Mía, ninguna
        RoutineAssignment leoAssignment = routineAssignmentRepository.saveAndFlush(
                assignment(leo, openEnded, TODAY.minusDays(30)));
        RoutineDay day = openEnded.getDays().get(0);
        closed(leoAssignment, day, SessionStatus.FINISHED, TODAY.minusDays(5), false);
        closed(leoAssignment, day, SessionStatus.FINISHED, TODAY.minusDays(4), false);
        closed(leoAssignment, day, SessionStatus.FINISHED, TODAY.minusDays(3), true);
        closed(leoAssignment, day, SessionStatus.CANCELLED, TODAY.minusDays(2), false);
        trainingSessionRepository.saveAndFlush(session(leoAssignment, day, TODAY));

        // Act
        List<PendingReviewRow> rows = read(() -> coachDashboardRepository.findPendingReviews(ana.getId(),
                SessionStatus.FINISHED.getId()));

        // Assert
        assertEquals(List.of(leo.getId()), ids(rows));
        assertEquals(2L, rows.get(0).getPendingCount());
    }

    @Test
    void shouldNotCountPendingSessionsOfInactiveAthletesOrOfAnotherCoach() {
        RoutineDay day = openEnded.getDays().get(0);
        RoutineAssignment teoAssignment = routineAssignmentRepository.saveAndFlush(
                assignment(teo, openEnded, TODAY.minusDays(30)));
        RoutineAssignment ciroAssignment = routineAssignmentRepository.saveAndFlush(
                assignment(ciro, openEnded, TODAY.minusDays(30)));
        closed(teoAssignment, day, SessionStatus.FINISHED, TODAY.minusDays(2), false);
        closed(ciroAssignment, day, SessionStatus.FINISHED, TODAY.minusDays(2), false);

        assertTrue(read(() -> coachDashboardRepository.findPendingReviews(ana.getId(),
                SessionStatus.FINISHED.getId())).isEmpty());
    }

    // ---------- sin peso reciente ----------

    @Test
    void shouldListTheAthletesWhoseLastWeightIsBeforeTheCutoffOrWhoNeverRecordedOne() {
        // Arrange: corte = hoy - 6 (7 días con hoy). Leo pesó justo en el corte (reciente); Mía, el día anterior y
        // antes; Ciro (otro entrenador) nunca
        LocalDate cutoff = TODAY.minusDays(6);
        weightRecordRepository.saveAndFlush(weightRecord(leo, TODAY.minusDays(20), "80.0"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, cutoff, "79.5"));
        weightRecordRepository.saveAndFlush(weightRecord(mia, TODAY.minusDays(30), "60.0"));
        weightRecordRepository.saveAndFlush(weightRecord(mia, cutoff.minusDays(1), "59.5"));

        // Act
        List<WeightGapRow> rows = read(() ->
                coachDashboardRepository.findAthletesWithoutRecentWeight(ana.getId(), cutoff));

        // Assert: Mía con su último peso
        assertEquals(List.of(mia.getId()), ids(rows));
        assertEquals(cutoff.minusDays(1), rows.get(0).getLastRecordedOn());
    }

    @Test
    void shouldReturnANullLastDateForAnAthleteWhoNeverRecordedAWeight() {
        weightRecordRepository.saveAndFlush(weightRecord(leo, TODAY, "80.0"));

        List<WeightGapRow> rows = read(() ->
                coachDashboardRepository.findAthletesWithoutRecentWeight(ana.getId(), TODAY.minusDays(6)));

        assertEquals(List.of(mia.getId()), ids(rows));
        assertNull(rows.get(0).getLastRecordedOn());
    }

    // ---------- helpers ----------

    private <T> T read(Supplier<T> query) {
        entityManager.flush();
        entityManager.clear();
        return query.get();
    }

    private static List<UUID> ids(List<? extends DashboardAthleteRow> rows) {
        return rows.stream().map(DashboardAthleteRow::getId).toList();
    }

    // Una sesión cerrada: se crea en progreso (una en progreso por atleta) y se pasa a su estado final con la hora de
    // fin; si reviewed, con la hora de revisión
    private void closed(RoutineAssignment assignment, RoutineDay day, SessionStatus status, LocalDate date,
                        boolean reviewed) {
        TrainingSession saved = trainingSessionRepository.saveAndFlush(session(assignment, day, date));
        Instant endedAt = middayInArgentina(date).plusSeconds(3600);
        jdbcTemplate.update("update training_sessions set status_id = ?, ended_at = ?, reviewed_at = ? where id = ?",
                status.getId(), Timestamp.from(endedAt), reviewed ? Timestamp.from(endedAt.plusSeconds(60)) : null,
                saved.getId());
    }
}
