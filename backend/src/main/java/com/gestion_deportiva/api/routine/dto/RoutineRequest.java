package com.gestion_deportiva.api.routine.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Alta de una rutina (US-13). Solo el nombre es obligatorio; isTemplate ausente = false
public record RoutineRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String name,

        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String description,

        @Size(max = 100, message = "El objetivo no puede superar los 100 caracteres")
        String goal,

        @Min(value = 1, message = "Los días por semana deben estar entre 1 y 7")
        @Max(value = 7, message = "Los días por semana deben estar entre 1 y 7")
        Short daysPerWeek,

        @Min(value = 1, message = "La duración debe estar entre 1 y 52 semanas")
        @Max(value = 52, message = "La duración debe estar entre 1 y 52 semanas")
        Short durationWeeks,

        Boolean isTemplate
) {
}
