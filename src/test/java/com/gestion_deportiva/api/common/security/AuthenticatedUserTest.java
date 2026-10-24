package com.gestion_deportiva.api.common.security;

import com.gestion_deportiva.api.auth.service.JwtService;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthenticatedUserTest {

    @Test
    void shouldTakeTheIdFromTheSubjectAndTheRoleFromItsClaim() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        AuthenticatedUser coach = AuthenticatedUser.from(jwt(id, "COACH"));
        AuthenticatedUser athlete = AuthenticatedUser.from(jwt(id, "ATHLETE"));

        // Assert
        assertEquals(id, coach.id());
        assertEquals(Role.COACH, coach.role());
        assertEquals(Role.ATHLETE, athlete.role());
    }

    @Test
    void shouldRejectAnUnknownRole() {
        assertThrows(IllegalArgumentException.class,
                () -> AuthenticatedUser.from(jwt(UUID.randomUUID(), "ADMIN")));
    }

    @Test
    void shouldRequireIdAndRole() {
        assertThrows(NullPointerException.class, () -> new AuthenticatedUser(null, Role.COACH));
        assertThrows(NullPointerException.class, () -> new AuthenticatedUser(UUID.randomUUID(), null));
    }

    private static Jwt jwt(UUID subject, String role) {
        return Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject(subject.toString())
                .claim(JwtService.ROLE_CLAIM, role)
                .build();
    }
}
