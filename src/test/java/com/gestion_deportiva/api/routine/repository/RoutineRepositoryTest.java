package com.gestion_deportiva.api.routine.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Coach ana;

    private Coach bruno;

    @BeforeEach
    void setUp() {
        ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
    }

    @Test
    void savesTheRoutineWithItsCoachDefaultsAndTimestamps() {
        Routine saved = routineRepository.saveAndFlush(routine("Fuerza", ana));

        Boolean isTemplate = jdbc.queryForObject(
                "select is_template from routines where id = ? and coach_id = ?", Boolean.class,
                saved.getId(), ana.getId());
        assertFalse(isTemplate);
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void duplicateNameForTheSameCoachIsRejectedByTheDatabaseIgnoringCase() {
        routineRepository.saveAndFlush(routine("Fuerza", ana));

        assertThrows(DataIntegrityViolationException.class,
                () -> routineRepository.saveAndFlush(routine("FUERZA", ana)));
    }

    @Test
    void sameNameIsAllowedForAnotherCoach() {
        routineRepository.saveAndFlush(routine("Fuerza", ana));
        routineRepository.saveAndFlush(routine("Fuerza", bruno));

        assertTrue(routineRepository.existsByCoachIdAndNameIgnoreCase(ana.getId(), "fuerza"));
        assertTrue(routineRepository.existsByCoachIdAndNameIgnoreCase(bruno.getId(), "FUERZA"));
    }

    @Test
    void existsByNameOnlyLooksAtTheCoachsRoutines() {
        routineRepository.saveAndFlush(routine("Fuerza", bruno));

        assertFalse(routineRepository.existsByCoachIdAndNameIgnoreCase(ana.getId(), "Fuerza"));
    }

    @Test
    void findByCoachIdReturnsOnlyTheCoachsRoutinesPaged() {
        // Arrange
        routineRepository.saveAndFlush(routine("B", ana));
        routineRepository.saveAndFlush(routine("A", ana));
        routineRepository.saveAndFlush(routine("C", ana));
        routineRepository.saveAndFlush(routine("Ajena", bruno));

        // Act
        Page<Routine> page = routineRepository.findByCoachId(ana.getId(), PageRequest.of(0, 2, Sort.by("name")));

        // Assert
        assertEquals(3, page.getTotalElements());
        assertEquals(List.of("A", "B"), page.getContent().stream().map(Routine::getName).toList());
    }

    @Test
    void blankNameIsRejectedByTheDatabase() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into routines (coach_id, name) values (?, '  ')", ana.getId()));
    }

    @ParameterizedTest
    @CsvSource({"days_per_week, 0", "days_per_week, 8", "duration_weeks, 0", "duration_weeks, 53"})
    void outOfRangeValuesAreRejectedByTheDatabase(String column, int value) {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into routines (coach_id, name, " + column + ") values (?, 'X', ?)", ana.getId(), value));
    }
}
