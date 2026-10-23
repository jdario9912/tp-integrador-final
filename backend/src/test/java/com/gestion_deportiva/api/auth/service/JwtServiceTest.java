package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.config.JwtConfig;
import com.gestion_deportiva.api.config.JwtProperties;
import com.gestion_deportiva.api.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Usa el encoder y el decoder reales de JwtConfig: valida el token tal como lo haría la API
class JwtServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00Z");
    private static final Duration ACCESS_TTL = Duration.ofMinutes(15);

    private final JwtConfig jwtConfig = new JwtConfig();
    private final JwtProperties properties = properties("secreto-de-prueba-con-al-menos-32-bytes", "api-test");
    private final JwtService jwtService = new JwtService(jwtConfig.jwtEncoder(properties), properties);

    @Test
    void shouldIssueTokenWithUserIdRoleIssuerAndExpiration() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));

        // Act
        JwtService.AccessToken token = jwtService.issue(coach, NOW);

        // Assert
        assertEquals(NOW.plus(ACCESS_TTL), token.expiresAt());
        Jwt jwt = decoderAt(NOW).decode(token.value());
        assertEquals(coach.getId().toString(), jwt.getSubject());
        assertEquals("COACH", jwt.getClaimAsString(JwtService.ROLE_CLAIM));
        assertEquals("api-test", jwt.getClaimAsString(JwtClaimNames.ISS));
        assertEquals(NOW, jwt.getIssuedAt());
        assertEquals(NOW.plus(ACCESS_TTL), jwt.getExpiresAt());
        assertEquals("JWT", jwt.getHeaders().get("typ"));
    }

    @Test
    void shouldIncludeTheAthleteRole() {
        Athlete athlete = withId(athlete("leo@test.com", null));

        Jwt jwt = decoderAt(NOW).decode(jwtService.issue(athlete, NOW).value());

        assertEquals("ATHLETE", jwt.getClaimAsString(JwtService.ROLE_CLAIM));
    }

    @Test
    void shouldNotIncludePersonalData() {
        Coach coach = withId(coach("ana@test.com"));

        Jwt jwt = decoderAt(NOW).decode(jwtService.issue(coach, NOW).value());

        assertEquals(Set.of("iss", "sub", "iat", "exp", "role"), jwt.getClaims().keySet());
    }

    @Test
    void shouldAcceptTokenUntilItExpires() {
        String token = jwtService.issue(withId(coach("ana@test.com")), NOW).value();

        assertDoesNotThrow(() -> decoderAt(NOW.plus(ACCESS_TTL).minusSeconds(1)).decode(token));
    }

    @Test
    void shouldRejectExpiredToken() {
        String token = jwtService.issue(withId(coach("ana@test.com")), NOW).value();

        // Pasada la tolerancia de reloj de 30 s
        assertThrows(JwtException.class, () -> decoderAt(NOW.plus(ACCESS_TTL).plusSeconds(31)).decode(token));
    }

    @Test
    void shouldRejectTokenSignedWithAnotherSecret() {
        JwtProperties other = properties("otro-secreto-distinto-de-al-menos-32-bytes", "api-test");
        String forged = new JwtService(jwtConfig.jwtEncoder(other), other)
                .issue(withId(coach("ana@test.com")), NOW).value();

        assertThrows(JwtException.class, () -> decoderAt(NOW).decode(forged));
    }

    @Test
    void shouldRejectTokenFromAnotherIssuer() {
        JwtProperties other = properties("secreto-de-prueba-con-al-menos-32-bytes", "otra-api");
        String token = new JwtService(jwtConfig.jwtEncoder(other), other)
                .issue(withId(coach("ana@test.com")), NOW).value();

        assertThrows(JwtException.class, () -> decoderAt(NOW).decode(token));
    }

    private JwtDecoder decoderAt(Instant instant) {
        return jwtConfig.jwtDecoder(properties, Clock.fixed(instant, ZoneOffset.UTC));
    }

    private static JwtProperties properties(String secret, String issuer) {
        return new JwtProperties(secret, issuer, ACCESS_TTL, Duration.ofHours(2));
    }

    private static <T extends User> T withId(T user) {
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        return user;
    }
}
