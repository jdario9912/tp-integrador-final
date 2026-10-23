package com.gestion_deportiva.api.coach.factory;

import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.registerCoachRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CoachFactoryTest {

    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    private final CoachFactory coachFactory = new CoachFactory(passwordEncoder);

    @Test
    void shouldCreateCoachWithHashedPasswordAndProfile() {
        // Arrange
        RegisterCoachRequest request = registerCoachRequest("  Ana@Test.COM ");
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);

        // Act
        Coach coach = coachFactory.create(request);

        // Assert
        assertEquals(Role.COACH, coach.getRole());
        assertEquals(PASSWORD_HASH, coach.getPasswordHash());
        assertEquals("ana@test.com", coach.getEmail());
        assertEquals(request.specialty(), coach.getSpecialty());
        assertEquals(request.licenseNumber(), coach.getLicenseNumber());
        assertEquals(request.bio(), coach.getBio());
    }
}
