package com.gestion_deportiva.api.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Estas validaciones hacen fallar el arranque: un secreto corto permitiría falsificar tokens por fuerza bruta
class JwtPropertiesTest {

    private static final Duration ACCESS = Duration.ofMinutes(15);
    private static final Duration REFRESH = Duration.ofHours(2);

    @Test
    void shouldAcceptSecretOfExactly32Bytes() {
        assertDoesNotThrow(() -> new JwtProperties("s".repeat(32), "api", ACCESS, REFRESH));
    }

    @Test
    void shouldRejectSecretShorterThan32Bytes() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new JwtProperties("s".repeat(31), "api", ACCESS, REFRESH));

        assertTrue(ex.getMessage().contains("JWT_SECRET"));
    }

    @Test
    void shouldCountTheSecretLengthInBytes() {
        // 16 caracteres "ñ" = 32 bytes en UTF-8
        assertDoesNotThrow(() -> new JwtProperties("ñ".repeat(16), "api", ACCESS, REFRESH));
    }

    @Test
    void shouldRejectZeroOrNegativeDurations() {
        String secret = "s".repeat(32);

        assertThrows(IllegalArgumentException.class, () -> new JwtProperties(secret, "api", Duration.ZERO, REFRESH));
        assertThrows(IllegalArgumentException.class,
                () -> new JwtProperties(secret, "api", ACCESS, Duration.ofMinutes(-1)));
    }
}
