package com.gestion_deportiva.api.training.repository;

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
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-12 · Consulta del día que toca (contrato 9.6): el último entrenamiento finalizado de una asignación, ordenado
// por la hora de fin. Los tests vacían el contexto antes de leer, así que lo que se compara sale de la consulta
class LastFinishedRoutineDayRepositoryTest extends AbstractIntegrationTest {

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
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    private Routine strength;

    // Torso (1), Pierna (2) y Movilidad (3). Sin ejercicios: la consulta no los necesita
    private RoutineDay upper;

    private RoutineDay lower;

    private RoutineDay mobility;

    private Athlete leo;

    private RoutineAssignment leoAssignment;

    private RoutineAssignment miaAssignment;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        Athlete mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));

        strength = routine("Fuerza", ana);
        upper = strength.addDay("Torso");
        lower = strength.addDay("Pierna");
        mobility = strength.addDay("Movilidad");
        strength = routineRepository.saveAndFlush(strength);

        leoAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength, NOV_11));
        miaAssignment = routineAssignmentRepository.saveAndFlush(assignment(mia, strength, NOV_11));
    }

    // ---------- sin entrenamientos finalizados ----------

    @Test
    void shouldReturnNothingWhenTheAssignmentHasNoSessions() {
        assertTrue(lastDay(leoAssignment).isEmpty());
    }

    @Test
    void shouldReturnNothingWhenTheOnlySessionsAreInProgressOrCancelled() {
        closed(leoAssignment, upper, SessionStatus.CANCELLED, at(18));
        trainingSessionRepository.saveAndFlush(session(leoAssignment, lower, NOV_11));

        assertTrue(lastDay(leoAssignment).isEmpty());
    }

    // ---------- la última finalizada ----------

    @Test
    void shouldReturnTheDayOfTheLastFinishedSession() {
        closed(leoAssignment, upper, SessionStatus.FINISHED, at(18));

        Optional<RoutineDayPosition> last = lastDay(leoAssignment);

        assertEquals(upper.getId(), last.orElseThrow().getDayId());
        assertEquals(upper.getDayNumber(), last.orElseThrow().getDayNumber());
    }

    @Test
    void shouldOrderByTheEndInstantAndNotByCreationOrder() {
        // Arrange: el torso se crea primero pero termina después que la pierna
        closed(leoAssignment, upper, SessionStatus.FINISHED, at(20));
        closed(leoAssignment, lower, SessionStatus.FINISHED, at(17));

        // Act + Assert
        assertEquals(upper.getId(), lastDay(leoAssignment).orElseThrow().getDayId());
    }

    @Test
    void shouldIgnoreCancelledAndInProgressSessionsWhenLookingForTheLastOne() {
        // Arrange: la cancelada termina después, y la en progreso ni siquiera termina
        closed(leoAssignment, upper, SessionStatus.FINISHED, at(18));
        closed(leoAssignment, lower, SessionStatus.CANCELLED, at(21));
        trainingSessionRepository.saveAndFlush(session(leoAssignment, mobility, NOV_11));

        assertEquals(upper.getId(), lastDay(leoAssignment).orElseThrow().getDayId());
    }

    @Test
    void shouldReturnOneRowEvenWhenThereAreSeveralFinishedSessions() {
        closed(leoAssignment, upper, SessionStatus.FINISHED, at(17));
        closed(leoAssignment, lower, SessionStatus.FINISHED, at(18));
        closed(leoAssignment, mobility, SessionStatus.FINISHED, at(19));
        entityManager.clear();

        List<RoutineDayPosition> rows = trainingSessionRepository.findRoutineDayPositions(
                leoAssignment.getId(), SessionStatus.FINISHED, PageRequest.of(0, 1));

        assertEquals(1, rows.size());
        assertEquals(mobility.getId(), rows.get(0).getDayId());
    }

    // ---------- solo la asignación pedida ----------

    @Test
    void shouldNotCountFinishedSessionsOfAPreviousAssignment() {
        // Arrange: Leo terminó Pierna con la asignación anterior; le reasignan la rutina
        closed(leoAssignment, lower, SessionStatus.FINISHED, at(18));
        leoAssignment.deactivate();
        routineAssignmentRepository.saveAndFlush(leoAssignment);
        RoutineAssignment newAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength,
                NOV_11));

        // Act + Assert: la rotación de la asignación nueva arranca de cero
        assertTrue(lastDay(newAssignment).isEmpty());
        assertEquals(lower.getId(), lastDay(leoAssignment).orElseThrow().getDayId());
    }

    @Test
    void shouldNotCountFinishedSessionsOfAnotherAthlete() {
        // Arrange: Mía (con su propia asignación de la misma rutina) termina Torso
        closed(miaAssignment, upper, SessionStatus.FINISHED, at(18));

        // Act + Assert
        assertFalse(lastDay(miaAssignment).isEmpty());
        assertTrue(lastDay(leoAssignment).isEmpty());
    }

    // ---------- helpers ----------

    private Optional<RoutineDayPosition> lastDay(RoutineAssignment assignment) {
        entityManager.flush();
        entityManager.clear();
        return trainingSessionRepository.findLastFinishedRoutineDay(assignment.getId());
    }

    // Una sesión que ya está cerrada: la crea en progreso (la regla de una en progreso por atleta) y la pasa a su
    // estado final con la hora de fin. V14 exige hora de fin solo en las cerradas
    private TrainingSession closed(RoutineAssignment assignment, RoutineDay day, SessionStatus status,
                                   Instant endedAt) {
        TrainingSession saved = trainingSessionRepository.saveAndFlush(session(assignment, day, NOV_11));
        jdbcTemplate.update("update training_sessions set status_id = ?, ended_at = ? where id = ?",
                status.getId(), Timestamp.from(endedAt), saved.getId());
        return saved;
    }

    // Horas del 11 de noviembre en UTC, en punto (sin fracciones: no hay problemas de precisión)
    private static Instant at(int hour) {
        return NOV_11.atTime(hour, 0).toInstant(ZoneOffset.UTC);
    }
}
