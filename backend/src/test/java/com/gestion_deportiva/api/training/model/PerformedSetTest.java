package com.gestion_deportiva.api.training.model;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PerformedSetTest {

    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    private TrainingSession trainingSession;

    private RoutineExercise press;

    @BeforeEach
    void setUp() {
        Coach ana = coach("ana@test.com");
        Athlete leo = athlete("leo@test.com", ana);
        Exercise bench = exercise("Press banca", MuscleGroup.CHEST, ana);
        Routine strength = routine("Fuerza", ana);
        RoutineDay upper = strength.addDay("Torso");
        press = routineExercise(bench); // 4 series
        upper.addExercise(press);
        RoutineAssignment active = assignment(leo, strength, LocalDate.of(2026, 11, 3));
        trainingSession = session(active, upper, NOV_11);
    }

    // ---------- alta ----------

    @Test
    void shouldStartWithoutDataAndWithItsSetNumber() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 2);

        assertNull(set.getId());
        assertEquals(trainingSession, set.getTrainingSession());
        assertEquals(press, set.getRoutineExercise());
        assertEquals((short) 2, set.getSetNumber());
        assertNull(set.getStatus());
        assertNull(set.getWeightKg());
        assertNull(set.getReps());
        assertNull(set.getRpe());
        assertNull(set.getSkipReason());
    }

    @Test
    void shouldRejectASetNumberBelowOneAndMissingReferences() {
        assertThrows(IllegalArgumentException.class, () -> new PerformedSet(trainingSession, press, (short) 0));
        assertThrows(NullPointerException.class, () -> new PerformedSet(null, press, (short) 1));
        assertThrows(NullPointerException.class, () -> new PerformedSet(trainingSession, null, (short) 1));
    }

    // ---------- realizada ----------

    @Test
    void shouldStoreTheWeightWithTwoDecimalsRepsAndRpe() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);

        set.markDone(new BigDecimal("62.5"), 8, 7);

        assertEquals(SetStatus.DONE, set.getStatus());
        assertEquals("62.50", set.getWeightKg().toPlainString());
        assertEquals((short) 8, set.getReps());
        assertEquals((short) 7, set.getRpe());
        assertNull(set.getSkipReason());
    }

    @Test
    void shouldKeepTheRpeEmptyWhenItIsNotLoaded() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);

        set.markDone(new BigDecimal("60"), 10, null);

        assertNull(set.getRpe());
    }

    @Test
    void shouldReplaceASkipWhenTheSetIsDoneAfterwards() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);
        set.markSkipped("Dolor de rodilla");

        set.markDone(new BigDecimal("50"), 5, 9);

        assertEquals(SetStatus.DONE, set.getStatus());
        assertNull(set.getSkipReason());
        assertEquals("50.00", set.getWeightKg().toPlainString());
    }

    @Test
    void shouldRejectInvalidDoneValuesInTheDomainToo() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);

        assertThrows(IllegalArgumentException.class, () -> set.markDone(new BigDecimal("-1"), 8, null));
        assertThrows(IllegalArgumentException.class, () -> set.markDone(new BigDecimal("60"), 0, null));
        assertThrows(IllegalArgumentException.class, () -> set.markDone(new BigDecimal("60"), 1000, null));
        assertThrows(IllegalArgumentException.class, () -> set.markDone(new BigDecimal("60"), 8, 0));
        assertThrows(IllegalArgumentException.class, () -> set.markDone(new BigDecimal("60"), 8, 11));
        assertThrows(NullPointerException.class, () -> set.markDone(null, 8, null));
    }

    // ---------- omitida ----------

    @Test
    void shouldDiscardTheValuesOfASkippedSetAndStoreTheTrimmedReason() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);
        set.markDone(new BigDecimal("60"), 8, 7);

        set.markSkipped("  Dolor de rodilla  ");

        assertEquals(SetStatus.SKIPPED, set.getStatus());
        assertNull(set.getWeightKg());
        assertNull(set.getReps());
        assertNull(set.getRpe());
        assertEquals("Dolor de rodilla", set.getSkipReason());
    }

    @Test
    void shouldRejectABlankOrTooLongSkipReason() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);

        assertThrows(IllegalArgumentException.class, () -> set.markSkipped("   "));
        assertThrows(IllegalArgumentException.class, () -> set.markSkipped("x".repeat(201)));
        assertThrows(NullPointerException.class, () -> set.markSkipped(null));
    }

    @Test
    void shouldAcceptAReasonOf200CharactersAfterTrimming() {
        PerformedSet set = new PerformedSet(trainingSession, press, (short) 1);

        set.markSkipped("  " + "x".repeat(200) + "  ");

        assertEquals(200, set.getSkipReason().length());
    }

    // ---------- identidad ----------

    @Test
    void shouldCompareByIdOnly() {
        PerformedSet first = new PerformedSet(trainingSession, press, (short) 1);
        PerformedSet second = new PerformedSet(trainingSession, press, (short) 1);
        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(first, "id", id);
        ReflectionTestUtils.setField(second, "id", id);

        assertEquals(first, second);
        assertEquals(first.hashCode(), second.hashCode());
        assertFalse(first.equals(new PerformedSet(trainingSession, press, (short) 1)));
        assertNotEquals(first, null);
        assertTrue(first.equals(first));
    }
}
