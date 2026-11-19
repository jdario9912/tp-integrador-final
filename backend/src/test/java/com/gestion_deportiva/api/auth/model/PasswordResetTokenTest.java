package com.gestion_deportiva.api.auth.model;

import com.gestion_deportiva.api.coach.model.Coach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordResetTokenTest {

    private static final String HASH = "a".repeat(PasswordResetToken.HASH_LENGTH);
    private static final Instant EXPIRES_AT = Instant.parse("2026-11-10T12:30:00Z");

    private final Coach user = coach("ana@test.com");

    @Test
    void shouldBeUsableUntilItExpires() {
        // Arrange
        PasswordResetToken token = new PasswordResetToken(user, HASH, EXPIRES_AT);

        // Assert: el vencimiento es exclusivo
        assertTrue(token.isUsable(EXPIRES_AT.minusSeconds(1)));
        assertFalse(token.isUsable(EXPIRES_AT));
    }

    @Test
    void shouldRejectAHashWithTheWrongLength() {
        assertThrows(IllegalArgumentException.class, () -> new PasswordResetToken(user, "abc", EXPIRES_AT));
    }

    @Test
    void shouldRejectMissingData() {
        assertThrows(NullPointerException.class, () -> new PasswordResetToken(null, HASH, EXPIRES_AT));
        assertThrows(NullPointerException.class, () -> new PasswordResetToken(user, null, EXPIRES_AT));
        assertThrows(NullPointerException.class, () -> new PasswordResetToken(user, HASH, null));
    }
}
