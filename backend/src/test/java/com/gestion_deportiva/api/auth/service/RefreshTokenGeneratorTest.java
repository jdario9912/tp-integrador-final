package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.model.RefreshToken;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshTokenGeneratorTest {

    private final RefreshTokenGenerator generator = new RefreshTokenGenerator();

    @Test
    void shouldGenerateUrlSafeTokensOf256Bits() {
        String token = generator.generate();

        // 32 bytes en Base64URL sin padding = 43 caracteres
        assertTrue(token.matches("[A-Za-z0-9_-]{43}"), token);
    }

    @Test
    void shouldNotRepeatTokens() {
        Set<String> tokens = new HashSet<>();
        IntStream.range(0, 1000).forEach(i -> tokens.add(generator.generate()));

        assertEquals(1000, tokens.size());
    }

    @Test
    void shouldHashWithSha256InLowercaseHex() {
        // Vector de prueba conocido de SHA-256
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", generator.hash("abc"));
    }

    @Test
    void hashShouldFitTheColumnAndBeDeterministic() {
        String token = generator.generate();

        String hash = generator.hash(token);

        assertEquals(RefreshToken.HASH_LENGTH, hash.length());
        assertEquals(hash, generator.hash(token));
        assertNotEquals(hash, generator.hash(generator.generate()));
        assertNotEquals(token, hash);
    }
}
