package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.model.Athlete;
import com.gestion_deportiva.api.model.Coach;
import com.gestion_deportiva.api.model.RefreshToken;
import com.gestion_deportiva.api.model.User;

import java.time.Duration;
import java.time.Instant;

// Datos de prueba reutilizables para los tests de identidad
public final class IdentityFixtures {

    public static final String PASSWORD_HASH = "$2a$10$fakeBcryptHashForTestsOnly";

    private IdentityFixtures() {
    }

    public static Coach coach(String email) {
        return new Coach("Ana", "Paz", email, PASSWORD_HASH);
    }

    public static Athlete athlete(String email, Coach coach) {
        return new Athlete("Leo", "Gil", email, PASSWORD_HASH, coach);
    }

    // Hash de 64 caracteres armado repitiendo un caracter (distinto char = distinto hash)
    public static String tokenHash(char c) {
        return String.valueOf(c).repeat(RefreshToken.HASH_LENGTH);
    }

    public static RefreshToken refreshToken(User user, char hashChar, Instant issuedAt) {
        return new RefreshToken(user, tokenHash(hashChar), issuedAt, issuedAt.plus(Duration.ofDays(7)));
    }
}
