package com.gestion_deportiva.api.athlete.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AthleteRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void findByEmailIgnoresCaseAndOnlyReturnsAthletes() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete saved = athleteRepository.saveAndFlush(athlete("leo@test.com", coach));

        assertEquals(saved.getId(), athleteRepository.findByEmail("LEO@Test.com").orElseThrow().getId());
        assertTrue(athleteRepository.findByEmail("ana@test.com").isEmpty());
    }

    @Test
    void findByCoachIdReturnsOnlyThatCoachsAthletesPaginated() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
        athleteRepository.saveAndFlush(athlete("a1@test.com", ana));
        athleteRepository.saveAndFlush(athlete("a2@test.com", ana));
        athleteRepository.saveAndFlush(athlete("a3@test.com", ana));
        athleteRepository.saveAndFlush(athlete("b1@test.com", bruno));
        athleteRepository.saveAndFlush(athlete("sin-coach@test.com", null));

        Page<Athlete> firstPage = athleteRepository.findByCoachId(ana.getId(), PageRequest.of(0, 2));

        assertEquals(3, firstPage.getTotalElements());
        assertEquals(2, firstPage.getContent().size());
        assertEquals(2, firstPage.getTotalPages());
        assertTrue(firstPage.getContent().stream().allMatch(ana::isOwnerOf));
        assertEquals(1, athleteRepository.findByCoachId(bruno.getId(), PageRequest.of(0, 10)).getTotalElements());
    }

    @Test
    void existsByIdAndCoachIdChecksOwnership() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
        Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));

        assertTrue(athleteRepository.existsByIdAndCoachId(athlete.getId(), ana.getId()));
        assertFalse(athleteRepository.existsByIdAndCoachId(athlete.getId(), bruno.getId()));
        assertFalse(athleteRepository.existsByIdAndCoachId(UUID.randomUUID(), ana.getId()));
    }

    @Test
    void unassigningTheCoachIsPersisted() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));

        athlete.unassignCoach();
        athleteRepository.saveAndFlush(athlete);

        assertNull(jdbc.queryForObject("select coach_id from athletes where user_id = ?", UUID.class, athlete.getId()));
        assertFalse(athleteRepository.existsByIdAndCoachId(athlete.getId(), ana.getId()));
    }

    @Test
    void unknownSexIdIsRejectedByForeignKey() {
        Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", null));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("update athletes set sex_id = 99 where user_id = ?", athlete.getId()));
    }

    @Test
    void availableDaysOutOfRangeIsRejectedByTheDatabase() {
        Athlete athlete = athleteRepository.saveAndFlush(athlete("leo@test.com", null));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("update athletes set available_days = 8 where user_id = ?", athlete.getId()));
    }
}
