package com.gestion_deportiva.api.athlete.dto;

import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// Edición completa (PUT, US-07): reemplaza todos los datos del atleta; un opcional ausente queda en null.
// Sin "password" (no se edita acá), "role", "status", "active" ni "coachId": se ignoran si vienen
public record UpdateAthleteRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        String lastName,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 255, message = "El email no puede superar los 255 caracteres")
        String email,

        @Size(max = 30, message = "El teléfono no puede superar los 30 caracteres")
        String phone,

        Sex sex,

        ExperienceLevel experienceLevel,

        @Past(message = "La fecha de nacimiento debe ser anterior a hoy")
        LocalDate birthDate,

        // numeric(5,2) en la base: hasta 3 enteros y 2 decimales
        @Positive(message = "La altura debe ser mayor a 0")
        @Digits(integer = 3, fraction = 2, message = "La altura admite hasta 3 enteros y 2 decimales")
        BigDecimal heightCm,

        @Positive(message = "El peso inicial debe ser mayor a 0")
        @Digits(integer = 3, fraction = 2, message = "El peso inicial admite hasta 3 enteros y 2 decimales")
        BigDecimal initialWeightKg,

        @Size(max = 255, message = "El objetivo no puede superar los 255 caracteres")
        String goal,

        @Size(max = 500, message = "Las lesiones no pueden superar los 500 caracteres")
        String injuries,

        @Size(max = 500, message = "Las limitaciones no pueden superar los 500 caracteres")
        String limitations,

        @Min(value = 1, message = "Los días disponibles deben estar entre 1 y 7")
        @Max(value = 7, message = "Los días disponibles deben estar entre 1 y 7")
        Short availableDays,

        LocalDate startDate
) {
}
