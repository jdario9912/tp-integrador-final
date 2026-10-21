package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.auth.model.RefreshToken;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.User;

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

    public static final String RAW_PASSWORD = "password123";

    // Request de registro válido con todos los campos completos
    public static RegisterCoachRequest registerCoachRequest(String email) {
        return new RegisterCoachRequest("Ana", "Paz", email, RAW_PASSWORD, "+54 11 5555-5555",
                "Fuerza", "MAT-1234", "Entrenadora de fuerza con 10 años de experiencia");
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
