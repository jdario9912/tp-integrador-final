package com.gestion_deportiva.api.training.model;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotReviewableException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Revisión del entrenador en la entidad (US-21, contrato 15.4): solo las sesiones finalizadas, la hora a microsegundos
// y la revisión que reemplaza a la anterior. Puro: la sesión se arma en memoria
class TrainingSessionReviewTest {

    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);
    private static final Instant ENDED_AT = Instant.parse("2026-11-11T23:00:00Z");
    // Con nanosegundos, como los que da el reloj de Java: la base solo guarda microsegundos
    private static final Instant REVIEWED_AT = Instant.parse("2026-11-12T12:00:00.123456789Z");

    private final Coach ana = coach("ana@test.com");
    private final Routine strength = routine("Fuerza", ana);
    private final RoutineDay upper = strength.addDay("Torso");
    private final RoutineAssignment active = assignment(athlete("leo@test.com", ana), strength,
            LocalDate.of(2026, 11, 3));

    @Test
    void shouldStartNotReviewed() {
        TrainingSession session = finishedSession();

        assertFalse(session.isReviewed());
        assertNull(session.getReviewedAt());
        assertNull(session.getCoachObservation());
    }

    @Test
    void shouldReviewAFinishedSessionWithItsObservation() {
        TrainingSession session = finishedSession();

        session.review(REVIEWED_AT, "Buen trabajo en el press");

        assertTrue(session.isReviewed());
        assertEquals("Buen trabajo en el press", session.getCoachObservation());
    }

    @Test
    void shouldTruncateTheReviewInstantToMicroseconds() {
        TrainingSession session = finishedSession();

        session.review(REVIEWED_AT, null);

        assertEquals(Instant.parse("2026-11-12T12:00:00.123456Z"), session.getReviewedAt());
    }

    @Test
    void shouldAcceptAReviewWithoutObservation() {
        TrainingSession session = finishedSession();

        session.review(REVIEWED_AT, null);

        assertTrue(session.isReviewed());
        assertNull(session.getCoachObservation());
    }

    @Test
    void shouldReplaceThePreviousReviewInsteadOfKeepingBoth() {
        TrainingSession session = finishedSession();
        session.review(REVIEWED_AT, "Primera");

        session.review(REVIEWED_AT.plusSeconds(60), null);

        assertEquals(Instant.parse("2026-11-12T12:01:00.123456Z"), session.getReviewedAt());
        assertNull(session.getCoachObservation());
    }

    @Test
    void shouldRejectReviewingAnInProgressSessionAndKeepItUnchanged() {
        TrainingSession session = session(active, upper, NOV_11);

        assertThrows(TrainingSessionNotReviewableException.class, () -> session.review(REVIEWED_AT, "Nada"));
        assertFalse(session.isReviewed());
        assertNull(session.getCoachObservation());
    }

    @Test
    void shouldRejectReviewingACancelledSession() {
        TrainingSession session = session(active, upper, NOV_11);
        session.cancel(ENDED_AT);

        assertThrows(TrainingSessionNotReviewableException.class, () -> session.review(REVIEWED_AT, null));
        assertFalse(session.isReviewed());
    }

    @Test
    void shouldRejectAMissingReviewInstant() {
        TrainingSession session = finishedSession();

        assertThrows(NullPointerException.class, () -> session.review(null, "Algo"));
    }

    private TrainingSession finishedSession() {
        TrainingSession session = session(active, upper, NOV_11);
        session.finish(ENDED_AT);
        return session;
    }
}
