package com.gestion_deportiva.api.coach.dto;

import com.gestion_deportiva.api.coach.model.Coach;

import java.time.Instant;
import java.util.UUID;

// Sin datos sensibles: nunca exponer passwordHash
public record CoachResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String specialty,
        String licenseNumber,
        String bio,
        Instant createdAt
) {

    public static CoachResponse from(Coach coach) {
        return new CoachResponse(
                coach.getId(),
                coach.getFirstName(),
                coach.getLastName(),
                coach.getEmail(),
                coach.getPhone(),
                coach.getSpecialty(),
                coach.getLicenseNumber(),
                coach.getBio(),
                coach.getCreatedAt());
    }
}
