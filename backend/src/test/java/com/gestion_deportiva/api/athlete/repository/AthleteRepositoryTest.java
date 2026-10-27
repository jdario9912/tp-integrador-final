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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.athlete.repository.AthleteSpecifications.belongsToCoach;
import static com.gestion_deportiva.api.athlete.repository.AthleteSpecifications.goalContains;
import static com.gestion_deportiva.api.athlete.repository.AthleteSpecifications.nameContains;
import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;

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

    // ---------- "Mis atletas" con Specifications (US-08) ----------

    @Test
    void belongsToCoachReturnsOnlyThatCoachsAthletesPaginated() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
        athleteRepository.saveAndFlush(athlete("a1@test.com", ana));
        athleteRepository.saveAndFlush(athlete("a2@test.com", ana));
        athleteRepository.saveAndFlush(athlete("a3@test.com", ana));
        athleteRepository.saveAndFlush(athlete("b1@test.com", bruno));
        athleteRepository.saveAndFlush(athlete("sin-coach@test.com", null));

        Page<Athlete> firstPage = athleteRepository.findAll(belongsToCoach(ana.getId()), PageRequest.of(0, 2));

        assertEquals(3, firstPage.getTotalElements());
        assertEquals(2, firstPage.getContent().size());
        assertEquals(2, firstPage.getTotalPages());
        assertTrue(firstPage.getContent().stream().allMatch(ana::isOwnerOf));
        assertEquals(1, athleteRepository.findAll(belongsToCoach(bruno.getId()), PageRequest.of(0, 10))
                .getTotalElements());
    }

    @Test
    void nameContainsMatchesFirstNameLastNameOrFullNameIgnoringCase() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        saveAthlete("leo@test.com", ana, "Leo", "Gil", null);
        saveAthlete("mia@test.com", ana, "Mía", "Sosa", null);
        saveAthlete("lea@test.com", ana, "Lea", "Gómez", null);

        assertEquals(Set.of("leo@test.com"), emails(ana, nameContains("LEO")));
        assertEquals(Set.of("mia@test.com"), emails(ana, nameContains("sos")));
        assertEquals(Set.of("leo@test.com"), emails(ana, nameContains("  leo gil ")));
        assertEquals(Set.of("leo@test.com", "lea@test.com"), emails(ana, nameContains("le")));
        assertEquals(Set.of(), emails(ana, nameContains("gil leo")));
    }

    @Test
    void goalContainsIgnoresCase() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        saveAthlete("leo@test.com", ana, "Leo", "Gil", "Ganar masa muscular");
        saveAthlete("mia@test.com", ana, "Mía", "Sosa", "Bajar de peso");
        saveAthlete("sin-objetivo@test.com", ana, "Ema", "Paz", null);

        assertEquals(Set.of("leo@test.com"), emails(ana, goalContains("MASA")));
        assertEquals(Set.of("mia@test.com"), emails(ana, goalContains("peso")));
    }

    @Test
    void nameAndGoalAreCombinedWithAnd() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        saveAthlete("leo@test.com", ana, "Leo", "Gil", "Hipertrofia");
        saveAthlete("lea@test.com", ana, "Lea", "Gómez", "Resistencia");

        assertEquals(Set.of("leo@test.com"), emails(ana, nameContains("le").and(goalContains("hiper"))));
    }

    @Test
    void blankFiltersDoNotFilter() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        saveAthlete("leo@test.com", ana, "Leo", "Gil", null);
        saveAthlete("mia@test.com", ana, "Mía", "Sosa", "Fuerza");

        assertEquals(2, emails(ana, nameContains(null).and(goalContains("  "))).size());
    }

    @Test
    void likeWildcardsAreSearchedLiterally() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        saveAthlete("leo@test.com", ana, "Leo", "Gil", "Bajar 10% de grasa");
        saveAthlete("mia@test.com", ana, "Mía", "Sosa", "Fuerza");

        assertEquals(Set.of("leo@test.com"), emails(ana, goalContains("%")));
        assertEquals(Set.of(), emails(ana, nameContains("_")));
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

    private void saveAthlete(String email, Coach owner, String firstName, String lastName, String goal) {
        athleteRepository.saveAndFlush(Athlete.builder()
                .firstName(firstName).lastName(lastName).email(email).passwordHash(PASSWORD_HASH)
                .coach(owner).goal(goal)
                .build());
    }

    private Set<String> emails(Coach owner, Specification<Athlete> filter) {
        return athleteRepository.findAll(belongsToCoach(owner.getId()).and(filter)).stream()
                .map(Athlete::getEmail)
                .collect(Collectors.toSet());
    }
}
