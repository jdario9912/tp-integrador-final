package com.gestion_deportiva.api.auth.model;

import com.gestion_deportiva.api.user.model.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.IdentityFixtures.tokenHash;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshTokenTest {

    private static final Instant ISSUED = Instant.parse("2026-10-13T10:00:00Z");
    private static final Instant EXPIRES = Instant.parse("2026-10-20T10:00:00Z");

    private final User user = coach("coach@test.com");

    @Test
    void newTokenIsActiveUntilItExpires() {
        RefreshToken token = new RefreshToken(user, tokenHash('a'), ISSUED, EXPIRES);

        assertFalse(token.isRevoked());
        assertTrue(token.isActive(ISSUED));
        assertTrue(token.isActive(EXPIRES.minusSeconds(1)));
        assertFalse(token.isActive(EXPIRES));
        assertFalse(token.isActive(EXPIRES.plusSeconds(1)));
    }

    @Test
    void revokedTokenIsNotActive() {
        RefreshToken token = new RefreshToken(user, tokenHash('a'), ISSUED, EXPIRES);

        token.revoke();
        assertTrue(token.isRevoked());
        assertFalse(token.isActive(ISSUED));
    }

    @Test
    void hashMustHaveExactly64Characters() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new RefreshToken(user, "abc", ISSUED, EXPIRES));
        assertEquals("tokenHash debe tener 64 caracteres", ex.getMessage());
        assertThrows(IllegalArgumentException.class,
                () -> new RefreshToken(user, "a".repeat(65), ISSUED, EXPIRES));
    }

    @Test
    void expirationMustBeAfterIssue() {
        assertThrows(IllegalArgumentException.class,
                () -> new RefreshToken(user, tokenHash('a'), ISSUED, ISSUED));
        assertThrows(IllegalArgumentException.class,
                () -> new RefreshToken(user, tokenHash('a'), ISSUED, ISSUED.minusSeconds(1)));
    }

    @Test
    void requiredFieldsCannotBeNull() {
        assertThrows(NullPointerException.class, () -> new RefreshToken(null, tokenHash('a'), ISSUED, EXPIRES));
        assertThrows(NullPointerException.class, () -> new RefreshToken(user, null, ISSUED, EXPIRES));
        assertThrows(NullPointerException.class, () -> new RefreshToken(user, tokenHash('a'), null, EXPIRES));
        assertThrows(NullPointerException.class, () -> new RefreshToken(user, tokenHash('a'), ISSUED, null));
    }
}
