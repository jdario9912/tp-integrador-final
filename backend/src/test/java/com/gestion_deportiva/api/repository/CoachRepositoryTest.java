package com.gestion_deportiva.api.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.model.Coach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CoachRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Test
    void findByEmailIgnoresCase() {
        Coach saved = coach("ana@test.com");
        saved.setSpecialty("Fuerza");
        coachRepository.saveAndFlush(saved);

        Coach found = coachRepository.findByEmail("ANA@test.com").orElseThrow();
        assertEquals(saved.getId(), found.getId());
        assertEquals("Fuerza", found.getSpecialty());
    }

    @Test
    void findByEmailOnlyReturnsCoaches() {
        athleteRepository.saveAndFlush(athlete("leo@test.com", null));

        assertTrue(coachRepository.findByEmail("leo@test.com").isEmpty());
    }
}
