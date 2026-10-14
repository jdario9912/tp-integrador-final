package com.gestion_deportiva.api.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.model.Athlete;
import com.gestion_deportiva.api.model.Coach;
import com.gestion_deportiva.api.model.User;
import com.gestion_deportiva.api.model.enums.AthleteStatus;
import com.gestion_deportiva.api.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.model.enums.Sex;
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

    private int count(String sql, Object id) {
        Integer value = jdbc.queryForObject(sql, Integer.class, id);
        return value == null ? 0 : value;
    }
}
