package com.gestion_deportiva.api.user.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.user.model.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.Map;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    @Test
    void findByEmailIgnoresCaseAndReturnsTheSubtype() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        athleteRepository.saveAndFlush(athlete("leo@test.com", coach));

        assertInstanceOf(Coach.class, userRepository.findByEmail("ANA@Test.com").orElseThrow());
        assertInstanceOf(Athlete.class, userRepository.findByEmail("Leo@TEST.com").orElseThrow());
        assertTrue(userRepository.findByEmail("nadie@test.com").isEmpty());
    }

    @Test
    void existsByEmailIgnoresCase() {
        coachRepository.saveAndFlush(coach("ana@test.com"));

        assertTrue(userRepository.existsByEmail("ANA@test.com"));
        assertFalse(userRepository.existsByEmail("otra@test.com"));
    }

    @Test
    void duplicateEmailIsRejectedIgnoringCase() {
        coachRepository.saveAndFlush(coach("dup@test.com"));

        assertThrows(DataIntegrityViolationException.class,
                () -> athleteRepository.saveAndFlush(athlete("DUP@test.com", null)));
    }

    @Test
    void duplicateEmailIsRejectedByTheDatabaseEvenWithoutNormalizing() {
        coachRepository.saveAndFlush(coach("dup@test.com"));

        // Insert directo con mayúsculas: lo frena el índice único lower(email), no Java
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into users (role_id, first_name, last_name, email, password_hash) values (1, 'X', 'Y', 'DUP@TEST.COM', 'h')"));
    }

    @Test
    void deletedUsersAreHiddenFromEveryJpaQuery() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", coach));
        athlete.markDeleted(Instant.parse("2026-10-29T10:00:00Z"));
        athleteRepository.saveAndFlush(athlete);
        // Sin esto, findById devolvería la entidad del contexto de persistencia sin pasar por la base
        entityManager.clear();

        assertTrue(athleteRepository.findById(athlete.getId()).isEmpty());
        assertTrue(userRepository.findById(athlete.getId()).isEmpty());
        assertFalse(athleteRepository.existsById(athlete.getId()));
        assertFalse(athleteRepository.existsByIdAndCoachId(athlete.getId(), coach.getId()));
        assertTrue(userRepository.findByEmail("leo@test.com").isEmpty());
        assertFalse(userRepository.existsByEmail("leo@test.com"));
        assertEquals(0, athleteRepository.count());
        // La fila sigue en la base
        assertEquals(1, count("select count(*) from users where id = ? and deleted_at is not null", athlete.getId()));
    }

    @Test
    void theEmailOfADeletedUserCanBeReused() {
        Athlete deleted = athleteRepository.saveAndFlush(athlete("leo@test.com", null));
        deleted.markDeleted(Instant.parse("2026-10-29T10:00:00Z"));
        athleteRepository.saveAndFlush(deleted);

        Athlete reused = athleteRepository.saveAndFlush(athlete("LEO@test.com", null));

        assertNotNull(reused.getId());
        entityManager.clear();
        assertEquals(reused.getId(), userRepository.findByEmail("leo@test.com").orElseThrow().getId());
    }

    @Test
    void deletingTwoUsersWithTheSameEmailIsAllowed() {
        // El índice parcial solo exige unicidad entre los no eliminados
        for (int i = 0; i < 2; i++) {
            Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", null));
            athlete.markDeleted(Instant.parse("2026-10-29T10:00:00Z"));
            athleteRepository.saveAndFlush(athlete);
        }

        assertEquals(2, count("select count(*) from users where email = ?", "leo@test.com"));
    }

    @Test
    void joinedInheritanceStoresARowInUsersAndInTheSubtypeTable() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", coach));

        assertEquals(1, count("select count(*) from users where id = ?", coach.getId()));
        assertEquals(1, count("select count(*) from coaches where user_id = ?", coach.getId()));
        assertEquals(1, count("select count(*) from users where id = ?", athlete.getId()));
        assertEquals(1, count("select count(*) from athletes where user_id = ?", athlete.getId()));
        assertEquals(0, count("select count(*) from coaches where user_id = ?", athlete.getId()));
    }

    @Test
    void rolesAndEnumsAreStoredAsCatalogIds() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete athlete = athlete("leo@test.com", coach);
        athlete.setSex(Sex.FEMALE);
        athlete.setExperienceLevel(ExperienceLevel.ADVANCED);
        athlete.changeStatus(AthleteStatus.NO_ROUTINE);
        athleteRepository.saveAndFlush(athlete);

        assertEquals(1, count("select role_id from users where id = ?", coach.getId()));
        assertEquals(2, count("select role_id from users where id = ?", athlete.getId()));
        Map<String, Object> row = jdbc.queryForMap(
                "select sex_id, experience_level_id, status_id from athletes where user_id = ?", athlete.getId());
        assertEquals(2, ((Number) row.get("sex_id")).intValue());
        assertEquals(3, ((Number) row.get("experience_level_id")).intValue());
        assertEquals(3, ((Number) row.get("status_id")).intValue());
    }

    @Test
    void timestampsAreFilledAutomatically() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));

        assertNotNull(coach.getCreatedAt());
        assertNotNull(coach.getUpdatedAt());
    }

    @Test
    void loginAndDeactivationArePersisted() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        Instant login = Instant.parse("2026-10-13T10:00:00Z");

        coach.recordLogin(login);
        coach.deactivate();
        coachRepository.saveAndFlush(coach);

        Map<String, Object> row = jdbc.queryForMap("select active, last_login_at from users where id = ?", coach.getId());
        assertEquals(false, row.get("active"));
        assertNotNull(row.get("last_login_at"));
    }

    @Test
    void unknownCatalogIdIsRejectedByForeignKey() {
        User coach = coachRepository.saveAndFlush(coach("ana@test.com"));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("update users set role_id = 99 where id = ?", coach.getId()));
    }

    private int count(String sql, Object param) {
        Integer value = jdbc.queryForObject(sql, Integer.class, param);
        return value == null ? 0 : value;
    }
}
