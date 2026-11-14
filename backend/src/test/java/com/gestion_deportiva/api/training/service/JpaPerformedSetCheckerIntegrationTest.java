package com.gestion_deportiva.api.training.service;

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
import com.gestion_deportiva.api.routine.service.PerformedSetChecker;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// El checker real de la rutina (US-19, B4) contra performed_sets: lo que consulta RoutineService antes de quitar un
// ejercicio. Quitar uno con series responde 422 en RoutineE2ETest y PerformedSetE2ETest
class JpaPerformedSetCheckerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private PerformedSetChecker performedSetChecker;

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

    private RoutineExercise bench;

    private RoutineExercise row;

    private TrainingSession session;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        Exercise benchExercise = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise rowExercise = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, ana));

        Routine strength = routine("Fuerza", ana);
        RoutineDay upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(benchExercise));
        upper.addExercise(routineExercise(rowExercise));
        strength = routineRepository.saveAndFlush(strength);
        bench = strength.getDays().get(0).getExercises().get(0);
        row = strength.getDays().get(0).getExercises().get(1);

        RoutineAssignment assignment = routineAssignmentRepository.saveAndFlush(
                assignment(leo, strength, LocalDate.of(2026, 11, 3)));
        session = trainingSessionRepository.saveAndFlush(
                session(assignment, strength.getDays().get(0), LocalDate.of(2026, 11, 11)));
    }

    @Test
    void shouldReportAnExerciseWithRegisteredSets() {
        // Arrange: una serie realizada del press
        PerformedSet set = new PerformedSet(session, bench, (short) 1);
        set.markDone(new BigDecimal("60"), 8, null);
        performedSetRepository.saveAndFlush(set);

        // Act + Assert: el press tiene series; el remo, no
        assertTrue(performedSetChecker.hasPerformedSets(Set.of(bench.getId())));
        assertTrue(performedSetChecker.hasPerformedSets(List.of(row.getId(), bench.getId())));
        assertFalse(performedSetChecker.hasPerformedSets(Set.of(row.getId())));
    }

    @Test
    void shouldReportNothingWithoutRegisteredSetsOrWithoutExercises() {
        assertFalse(performedSetChecker.hasPerformedSets(Set.of(bench.getId(), row.getId())));
        assertFalse(performedSetChecker.hasPerformedSets(List.of()));
        assertFalse(performedSetChecker.hasPerformedSets(Set.of(UUID.randomUUID())));
    }
}
