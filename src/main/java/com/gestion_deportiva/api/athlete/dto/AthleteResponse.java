package com.gestion_deportiva.api.athlete.dto;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// Sin datos sensibles: nunca exponer passwordHash
public record AthleteResponse(
        UUID id,
        UUID coachId,
        String firstName,
        String lastName,
        String email,
        String phone,
        AthleteStatus status,
        // false = cuenta desactivada: no puede iniciar sesión (US-07)
        boolean active,
        Sex sex,
        ExperienceLevel experienceLevel,
        LocalDate birthDate,
        BigDecimal heightCm,
        BigDecimal initialWeightKg,
        String goal,
        String injuries,
        String limitations,
        Short availableDays,
        LocalDate startDate,
        Instant createdAt
) {

    public static AthleteResponse from(Athlete athlete) {
        return new AthleteResponse(
                athlete.getId(),
                athlete.getCoach() != null ? athlete.getCoach().getId() : null,
                athlete.getFirstName(),
                athlete.getLastName(),
                athlete.getEmail(),
                athlete.getPhone(),
                athlete.getStatus(),
                athlete.isActive(),
                athlete.getSex(),
                athlete.getExperienceLevel(),
                athlete.getBirthDate(),
                athlete.getHeightCm(),
                athlete.getInitialWeightKg(),
                athlete.getGoal(),
                athlete.getInjuries(),
                athlete.getLimitations(),
                athlete.getAvailableDays(),
                athlete.getStartDate(),
                athlete.getCreatedAt());
    }
}
