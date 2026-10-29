package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.dto.UpdateAthleteRequest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;
import com.gestion_deportiva.api.auth.model.RefreshToken;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.User;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

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

    // Request de alta de atleta válido con todos los campos completos
    public static CreateAthleteRequest createAthleteRequest(String email) {
        return new CreateAthleteRequest("Leo", "Gil", email, RAW_PASSWORD, "+54 11 4444-4444",
                Sex.MALE, ExperienceLevel.INTERMEDIATE, LocalDate.of(2000, 5, 20),
                new BigDecimal("178.50"), new BigDecimal("80.25"), "Hipertrofia", "Rodilla izquierda",
                "Sin saltos", (short) 4, LocalDate.of(2026, 11, 1));
    }

    // Solo los campos obligatorios: el resto del perfil queda en null
    public static CreateAthleteRequest createAthleteRequestWithOnlyRequired(String email, String password) {
        return new CreateAthleteRequest("Leo", "Gil", email, password, null, null, null, null, null, null,
                null, null, null, null, null);
    }

    // Request de edición válido con todos los campos completos y distintos a los de createAthleteRequest
    public static UpdateAthleteRequest updateAthleteRequest(String email) {
        return new UpdateAthleteRequest("Leandro", "Gimenez", email, "+54 11 3333-3333",
                Sex.OTHER, ExperienceLevel.ADVANCED, LocalDate.of(1998, 3, 10),
                new BigDecimal("180.00"), new BigDecimal("75.50"), "Fuerza", "Hombro derecho",
                "Sin overhead", (short) 5, LocalDate.of(2026, 12, 1));
    }

    // Solo los campos obligatorios: el resto del perfil queda en null
    public static UpdateAthleteRequest updateAthleteRequestWithOnlyRequired(String email) {
        return new UpdateAthleteRequest("Leo", "Gil", email, null, null, null, null, null, null, null, null,
                null, null, null);
    }

    // Hash de 64 caracteres armado repitiendo un caracter (distinto char = distinto hash)
    public static String tokenHash(char c) {
        return String.valueOf(c).repeat(RefreshToken.HASH_LENGTH);
    }

    public static RefreshToken refreshToken(User user, char hashChar, Instant issuedAt) {
        return new RefreshToken(user, tokenHash(hashChar), issuedAt, issuedAt.plus(Duration.ofDays(7)));
    }
}
