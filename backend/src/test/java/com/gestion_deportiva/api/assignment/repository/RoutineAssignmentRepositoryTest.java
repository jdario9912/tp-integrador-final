package com.gestion_deportiva.api.assignment.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.util.List;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.AssignmentFixtures.completeRoutine;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineAssignmentRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate JAN_1 = LocalDate.of(2026, 1, 1);
    private static final LocalDate JAN_10 = LocalDate.of(2026, 1, 10);
    private static final LocalDate MAR_10 = LocalDate.of(2026, 3, 10);

    @Autowired
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private RoutineRepository routineRepository;

    private Athlete leo;

    private Athlete mia;

    private Routine strength;

    private Routine hypertrophy;

    private Routine base;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        strength = routineRepository.saveAndFlush(completeRoutine("Fuerza", ana, bench));
        hypertrophy = routineRepository.saveAndFlush(completeRoutine("Hipertrofia", ana, bench));
        base = routineRepository.saveAndFlush(completeRoutine("Base", ana, bench));
    }

    @Test
    void shouldRejectASecondActiveAssignmentForTheSameAthlete() {
        // Arrange
        routineAssignmentRepository.saveAndFlush(assignment(leo, strength, JAN_1));

        // Act + Assert: ux_routine_assignments_athlete_active
        assertThrows(DataIntegrityViolationException.class,
                () -> routineAssignmentRepository.saveAndFlush(assignment(leo, hypertrophy, JAN_10)));
    }

    @Test
    void shouldAllowManyInactiveAssignmentsAndOneActivePerAthlete() {
        // Arrange
        RoutineAssignment first = assignment(leo, strength, JAN_1);
        first.deactivate();
        RoutineAssignment second = assignment(leo, hypertrophy, JAN_10);
        second.deactivate();

        // Act
        routineAssignmentRepository.saveAllAndFlush(List.of(first, second,
                assignment(leo, base, MAR_10), assignment(mia, strength, MAR_10)));

        // Assert
        assertEquals(4, routineAssignmentRepository.count());
    }

    @Test
    void shouldFindOnlyTheActiveAssignmentOfTheAthlete() {
        RoutineAssignment previous = assignment(leo, strength, JAN_1);
        previous.deactivate();
        routineAssignmentRepository.saveAllAndFlush(List.of(previous, assignment(leo, hypertrophy, JAN_10),
                assignment(mia, base, JAN_10)));

        RoutineAssignment active = routineAssignmentRepository.findByAthleteIdAndActiveTrue(leo.getId()).orElseThrow();

        assertEquals("Hipertrofia", active.getRoutine().getName());
        assertTrue(active.isActive());
    }

    @Test
    void shouldFindNoActiveAssignmentWhenAllAreInactive() {
        RoutineAssignment previous = assignment(leo, strength, JAN_1);
        previous.deactivate();
        routineAssignmentRepository.saveAndFlush(previous);

        assertFalse(routineAssignmentRepository.findByAthleteIdAndActiveTrue(leo.getId()).isPresent());
    }

    @Test
    void shouldListTheHistoryWithTheActiveFirstThenNewestFirstIgnoringTheClientSort() {
        // Arrange: la activa es la más vieja
        RoutineAssignment older = assignment(leo, strength, JAN_10);
        older.deactivate();
        RoutineAssignment newer = assignment(leo, hypertrophy, MAR_10);
        newer.deactivate();
        routineAssignmentRepository.saveAllAndFlush(List.of(older, newer, assignment(leo, base, JAN_1),
                assignment(mia, strength, MAR_10)));

        // Act
        Page<RoutineAssignment> page = routineAssignmentRepository.findHistory(leo.getId(),
                PageRequest.of(0, 20, Sort.by("assignmentDate")));

        // Assert
        assertEquals(List.of("Base", "Hipertrofia", "Fuerza"),
                page.map(assignment -> assignment.getRoutine().getName()).getContent());
        assertEquals(3, page.getTotalElements());
    }
}
