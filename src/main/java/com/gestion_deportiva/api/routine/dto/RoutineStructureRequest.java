package com.gestion_deportiva.api.routine.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// Estructura completa de la rutina (US-14). El orden de la lista define el número de cada día
public record RoutineStructureRequest(

        @NotNull(message = "Los días son obligatorios")
        @Size(max = 7, message = "La rutina no puede tener más de 7 días")
        List<@NotNull(message = "El día es obligatorio") @Valid RoutineDayRequest> days
) {
}
