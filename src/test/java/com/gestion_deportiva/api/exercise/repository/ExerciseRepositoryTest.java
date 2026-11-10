package com.gestion_deportiva.api.exercise.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.exercise.repository.ExerciseSpecifications.muscleGroupIs;
import static com.gestion_deportiva.api.exercise.repository.ExerciseSpecifications.nameContains;
import static com.gestion_deportiva.api.exercise.repository.ExerciseSpecifications.visibleTo;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Los ejercicios globales precargados por la V3 pueden no estar (los e2e hacen TRUNCATE users CASCADE, que
// también vacía exercises): cada test arma sus propios globales y los filtra por nombre o los cuenta aparte
class ExerciseRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private EntityManager entityManager;

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
    void savesTheExerciseWithItsCatalogIdAndTimestamps() {
        Exercise saved = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.TRICEPS, ana));

        Short muscleGroupId = jdbc.queryForObject(
                "select muscle_group_id from exercises where id = ?", Short.class, saved.getId());
        assertEquals(MuscleGroup.TRICEPS.getId(), muscleGroupId);
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void visibleToReturnsGlobalsAndOwnButNotOtherCoaches() {
        // Arrange
        Exercise global = exerciseRepository.saveAndFlush(exercise("zz Global test", MuscleGroup.CHEST, null));
        Exercise own = exerciseRepository.saveAndFlush(exercise("zz Propio", MuscleGroup.CHEST, ana));
        Exercise foreign = exerciseRepository.saveAndFlush(exercise("zz Ajeno", MuscleGroup.CHEST, bruno));

        // Act
        Set<UUID> ids = ids(exerciseRepository.findAll(visibleTo(ana.getId())));

        // Assert
        assertTrue(ids.contains(global.getId()));
        assertTrue(ids.contains(own.getId()));
        assertFalse(ids.contains(foreign.getId()));
        long globals = exerciseRepository.findAll().stream().filter(Exercise::isGlobal).count();
        assertEquals(globals + 1, ids.size());
    }

    @Test
    void nameContainsIgnoresCaseAndSearchesWildcardsLiterally() {
        // Arrange
        Exercise press = exerciseRepository.saveAndFlush(exercise("zz Press de BANCA", MuscleGroup.CHEST, ana));
        Exercise percent = exerciseRepository.saveAndFlush(exercise("zz 100% banca", MuscleGroup.CHEST, ana));
        exerciseRepository.saveAndFlush(exercise("zz Remo", MuscleGroup.BACK, ana));

        // Act + Assert
        assertEquals(Set.of(press.getId(), percent.getId()), ids(search("ZZ", "banca", null)));
        assertEquals(Set.of(percent.getId()), ids(search("zz", "%", null)));
        assertEquals(Set.of(), ids(search("zz", "_anca_", null)));
    }

    @Test
    void muscleGroupAndNameAreCombinedWithAnd() {
        // Arrange
        Exercise chest = exerciseRepository.saveAndFlush(exercise("zz Press", MuscleGroup.CHEST, ana));
        exerciseRepository.saveAndFlush(exercise("zz Press militar", MuscleGroup.SHOULDERS, ana));
        exerciseRepository.saveAndFlush(exercise("zz Aperturas", MuscleGroup.CHEST, ana));

        // Act + Assert
        assertEquals(Set.of(chest.getId()), ids(search("zz", "press", MuscleGroup.CHEST)));
    }

    @Test
    void blankFiltersDoNotFilter() {
        exerciseRepository.saveAndFlush(exercise("zz Press", MuscleGroup.CHEST, ana));

        long all = exerciseRepository.count(visibleTo(ana.getId()));

        assertEquals(all, exerciseRepository.count(
                Specification.allOf(visibleTo(ana.getId()), nameContains("  "), muscleGroupIs(null))));
    }

    @Test
    void listingIsPaginated() {
        for (int i = 0; i < 5; i++) {
            exerciseRepository.saveAndFlush(exercise("zz Ejercicio " + i, MuscleGroup.CHEST, ana));
        }

        Page<Exercise> page = exerciseRepository.findAll(
                Specification.allOf(visibleTo(ana.getId()), nameContains("zz ejercicio")),
                PageRequest.of(1, 2, Sort.by("name", "id")));

        assertEquals(5, page.getTotalElements());
        assertEquals(3, page.getTotalPages());
        assertEquals(List.of("zz Ejercicio 2", "zz Ejercicio 3"), page.map(Exercise::getName).getContent());
    }

    @Test
    void existsByCreatedByIdAndNameIgnoreCaseOnlyLooksAtThatCoach() {
        exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, ana));

        assertTrue(exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(ana.getId(), "PRESS"));
        assertFalse(exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(bruno.getId(), "Press"));
    }

    @Test
    void duplicateNameForTheSameCoachIsRejectedByTheDatabaseIgnoringCase() {
        exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, ana));

        assertThrows(DataIntegrityViolationException.class,
                () -> exerciseRepository.saveAndFlush(exercise("PRESS", MuscleGroup.BACK, ana)));
    }

    @Test
    void sameNameIsAllowedForAnotherCoachAndForAGlobal() {
        exerciseRepository.saveAndFlush(exercise("zz Press único", MuscleGroup.CHEST, null));
        exerciseRepository.saveAndFlush(exercise("zz Press único", MuscleGroup.CHEST, ana));
        exerciseRepository.saveAndFlush(exercise("zz Press único", MuscleGroup.CHEST, bruno));

        assertEquals(3, exerciseRepository.count(nameContains("zz press único")));
    }

    @Test
    void duplicateGlobalNameIsRejectedByTheDatabase() {
        exerciseRepository.saveAndFlush(exercise("zz Global repetido", MuscleGroup.CHEST, null));

        assertThrows(DataIntegrityViolationException.class,
                () -> exerciseRepository.saveAndFlush(exercise("ZZ global repetido", MuscleGroup.CHEST, null)));
    }

    @Test
    void deletedExercisesAreHiddenAndTheirNameCanBeReused() {
        // Arrange
        Exercise deleted = exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, ana));
        deleted.markDeleted(Instant.now());
        exerciseRepository.saveAndFlush(deleted);
        entityManager.clear();

        // Assert: oculto para JPA, pero la fila sigue en la base
        assertTrue(exerciseRepository.findById(deleted.getId()).isEmpty());
        assertFalse(ids(exerciseRepository.findAll(visibleTo(ana.getId()))).contains(deleted.getId()));
        assertFalse(exerciseRepository.existsByCreatedByIdAndNameIgnoreCase(ana.getId(), "Press"));
        assertEquals(1, jdbc.queryForObject("select count(*) from exercises where id = ? and deleted_at is not null",
                Integer.class, deleted.getId()));

        // Act + Assert: el nombre queda libre
        exerciseRepository.saveAndFlush(exercise("Press", MuscleGroup.CHEST, ana));
    }

    @Test
    void findVisibleByIdInReturnsOnlyGlobalsAndOwnThatAreNotDeleted() {
        // Arrange
        Exercise global = exerciseRepository.saveAndFlush(exercise("ZZ global visible", MuscleGroup.CHEST, null));
        Exercise own = exerciseRepository.saveAndFlush(exercise("Propio", MuscleGroup.CHEST, ana));
        Exercise foreign = exerciseRepository.saveAndFlush(exercise("Ajeno", MuscleGroup.CHEST, bruno));
        Exercise deleted = exerciseRepository.saveAndFlush(exercise("Eliminado", MuscleGroup.CHEST, ana));
        deleted.markDeleted(Instant.now());
        exerciseRepository.saveAndFlush(deleted);
        entityManager.clear();

        // Act
        List<Exercise> visible = exerciseRepository.findVisibleByIdIn(ana.getId(),
                List.of(global.getId(), own.getId(), foreign.getId(), deleted.getId(), UUID.randomUUID()));

        // Assert
        assertEquals(Set.of(global.getId(), own.getId()),
                visible.stream().map(Exercise::getId).collect(Collectors.toSet()));
    }

    @Test
    void unknownMuscleGroupIdIsRejectedByForeignKey() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into exercises (muscle_group_id, name) values (99, 'X')"));
    }

    @Test
    void blankNameIsRejectedByTheDatabase() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into exercises (muscle_group_id, name) values (1, '   ')"));
    }

    private List<Exercise> search(String scope, String name, MuscleGroup muscleGroup) {
        return exerciseRepository.findAll(Specification.allOf(
                visibleTo(ana.getId()), nameContains(scope), nameContains(name), muscleGroupIs(muscleGroup)));
    }

    private static Set<UUID> ids(List<Exercise> exercises) {
        return exercises.stream().map(Exercise::getId).collect(Collectors.toSet());
    }
}
