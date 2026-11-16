package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

// Ítem del historial (US-21, contrato 15.3): nombra la rutina y el día, lleva el resumen que le pasa el service y la
// revisión solo si existe
class TrainingSessionHistoryItemTest {

    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);
    private static final TrainingSessionSummary SUMMARY = TrainingSessionSummary.of(7, 3, 1, new BigDecimal("500"));

    private final Coach ana = coach("ana@test.com");
    private final Routine strength = routine("Fuerza", ana);
    private final RoutineDay lower = strength.addDay("Pierna");
    private final RoutineAssignment active = assignment(athlete("leo@test.com", ana), strength,
            LocalDate.of(2026, 11, 3));

    @Test
    void shouldNameTheRoutineAndTheDayAndCarryTheSummary() {
        TrainingSession session = finishedSession();

        TrainingSessionHistoryItem item = TrainingSessionHistoryItem.from(session, SUMMARY);

        assertEquals(session.getId(), item.id());
        assertEquals(NOV_11, item.sessionDate());
        assertEquals(SessionStatus.FINISHED, item.status());
        assertEquals(session.getStartedAt(), item.startedAt());
        assertEquals(session.getEndedAt(), item.endedAt());
        assertEquals("Fuerza", item.routineName());
        assertEquals(lower.getDayNumber(), item.dayNumber());
        assertEquals("Pierna", item.dayName());
        assertEquals(SUMMARY, item.summary());
    }

    @Test
    void shouldHaveNoReviewWhenTheSessionWasNotReviewed() {
        assertNull(TrainingSessionHistoryItem.from(finishedSession(), SUMMARY).review());
    }

    @Test
    void shouldCarryTheReviewWhenTheSessionWasReviewed() {
        TrainingSession session = finishedSession();
        session.review(Instant.parse("2026-11-12T12:00:00Z"), "Bien");

        TrainingSessionReviewResponse review = TrainingSessionHistoryItem.from(session, SUMMARY).review();

        assertEquals(Instant.parse("2026-11-12T12:00:00Z"), review.reviewedAt());
        assertEquals("Bien", review.observation());
    }

    private TrainingSession finishedSession() {
        TrainingSession session = session(active, lower, NOV_11);
        session.finish(Instant.parse("2026-11-11T23:00:00Z"));
        return session;
    }
}
