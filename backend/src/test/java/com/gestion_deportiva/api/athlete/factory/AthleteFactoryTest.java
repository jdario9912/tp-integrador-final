package com.gestion_deportiva.api.athlete.factory;

import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AthleteFactoryTest {

    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    private final AthleteFactory athleteFactory = new AthleteFactory(passwordEncoder);

    @Test
    void shouldCreateActiveAthleteAssignedToCoachWithHashedPassword() {
        // Arrange
        Coach coach = coach("ana@test.com");
        CreateAthleteRequest request = createAthleteRequest("  Leo@Test.COM ");
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);

        // Act
        Athlete athlete = athleteFactory.create(new NewAthlete(request, coach));

        // Assert
        assertEquals(Role.ATHLETE, athlete.getRole());
        assertEquals(AthleteStatus.ACTIVE, athlete.getStatus());
        assertEquals(PASSWORD_HASH, athlete.getPasswordHash());
        assertEquals("leo@test.com", athlete.getEmail());
        assertSame(coach, athlete.getCoach());
        assertEquals(request.availableDays(), athlete.getAvailableDays());
        assertEquals(request.goal(), athlete.getGoal());
    }
}
