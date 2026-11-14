package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static org.junit.jupiter.api.Assertions.assertEquals;

// Resumen de la sesión (US-20, contrato 14.4): lo prescrito del día contra lo registrado y el volumen de las series
// realizadas. Puro: la sesión y sus series se arman en memoria
class TrainingSessionSummaryTest {

    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    private final Coach ana = coach("ana@test.com");
    private final Routine strength = routine("Fuerza", ana);
    // Torso: press (4 series) y remo (3 series). Pierna: sentadilla (5 series)
    private final RoutineDay upper = strength.addDay("Torso");
    private final RoutineExercise bench = addExercise(upper, "Press banca", 4);
    private final RoutineExercise row = addExercise(upper, "Remo bajo", 3);
    private final RoutineDay lower = strength.addDay("Pierna");
    private final RoutineExercise squat = addExercise(lower, "Sentadilla", 5);
    private final RoutineAssignment active =
            assignment(athlete("leo@test.com", ana), strength, LocalDate.of(2026, 11, 3));

    @Test
    void shouldSumThePrescribedSetsOfTheDay() {
        TrainingSessionSummary summary = TrainingSessionSummary.from(session(active, upper, NOV_11), List.of());

        assertEquals(7, summary.prescribedSets());
        assertEquals(0, summary.doneSets());
        assertEquals(0, summary.skippedSets());
        assertEquals(7, summary.pendingSets());
        assertEquals(new BigDecimal("0.00"), summary.volumeKg());
    }

    @Test
    void shouldCountTheDoneAndSkippedSetsAndTheRestAsPending() {
        // Arrange: press 1 y 2 realizadas, press 3 omitida, remo 1 realizada
        TrainingSession session = session(active, upper, NOV_11);
        List<PerformedSet> sets = List.of(
                done(session, bench, 1, "60", 10),
                done(session, bench, 2, "62.5", 8),
                skipped(session, bench, 3, "Molestia en el hombro"),
                done(session, row, 1, "40", 12));

        // Act
        TrainingSessionSummary summary = TrainingSessionSummary.from(session, sets);

        // Assert
        assertEquals(7, summary.prescribedSets());
        assertEquals(3, summary.doneSets());
        assertEquals(1, summary.skippedSets());
        assertEquals(3, summary.pendingSets());
    }

    @Test
    void shouldSumTheVolumeOfTheDoneSetsAsWeightTimesReps() {
        // Arrange: 60 × 10 = 600 y 62,5 × 8 = 500; la omitida no cuenta
        TrainingSession session = session(active, upper, NOV_11);
        List<PerformedSet> sets = List.of(
                done(session, bench, 1, "60", 10),
                done(session, bench, 2, "62.5", 8),
                skipped(session, bench, 3, "Sin tiempo"));

        // Act + Assert: dos decimales, aunque los kilos vengan en entero
        assertEquals(new BigDecimal("1100.00"), TrainingSessionSummary.from(session, sets).volumeKg());
    }

    @Test
    void shouldKeepTwoDecimalsInTheVolume() {
        // Arrange: 62,25 × 3 = 186,75
        TrainingSession session = session(active, upper, NOV_11);

        // Act + Assert
        assertEquals(new BigDecimal("186.75"),
                TrainingSessionSummary.from(session, List.of(done(session, bench, 1, "62.25", 3))).volumeKg());
    }

    @Test
    void shouldCountTheSetsOfTheDayOnly() {
        // Arrange: la sesión de Pierna prescribe 5 series; el remo de Torso no cuenta en ella
        TrainingSession session = session(active, lower, NOV_11);

        // Act
        TrainingSessionSummary summary = TrainingSessionSummary.from(session, List.of());

        // Assert
        assertEquals(5, summary.prescribedSets());
        assertEquals(5, summary.pendingSets());
    }

    // El entrenador pudo bajar las series del ejercicio después de registrar algunas: pendientes no es negativo
    @Test
    void shouldNeverCountNegativePendingSets() {
        // Arrange: el día prescribe 7 series y ya hay 9 registradas (6 realizadas y 3 omitidas)
        TrainingSession session = session(active, upper, NOV_11);
        List<PerformedSet> sets = List.of(
                done(session, bench, 1, "60", 10), done(session, bench, 2, "60", 10),
                done(session, bench, 3, "60", 10), done(session, bench, 4, "60", 10),
                done(session, row, 1, "40", 12), done(session, row, 2, "40", 12),
                skipped(session, row, 3, "Sin tiempo"), skipped(session, bench, 5, "Sin tiempo"),
                skipped(session, bench, 6, "Sin tiempo"));

        // Act + Assert
        TrainingSessionSummary summary = TrainingSessionSummary.from(session, sets);
        assertEquals(7, summary.prescribedSets());
        assertEquals(0, summary.pendingSets());
    }

    private RoutineExercise addExercise(RoutineDay day, String name, int sets) {
        Exercise exercise = exercise(name, MuscleGroup.CHEST, ana);
        RoutineExercise routineExercise = RoutineExercise.builder()
                .exercise(exercise)
                .sets((short) sets)
                .reps((short) 10)
                .build();
        day.addExercise(routineExercise);
        return routineExercise;
    }

    private static PerformedSet done(TrainingSession session, RoutineExercise exercise, int number, String weight,
                                     int reps) {
        PerformedSet set = new PerformedSet(session, exercise, (short) number);
        set.markDone(new BigDecimal(weight), reps, null);
        return set;
    }

    private static PerformedSet skipped(TrainingSession session, RoutineExercise exercise, int number, String reason) {
        PerformedSet set = new PerformedSet(session, exercise, (short) number);
        set.markSkipped(reason);
        return set;
    }
}
