package com.gestion_deportiva.api.assignment.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// Asignación de una rutina (US-16). Sin athleteId: sale de la ruta.
// replaceActive confirma que la rutina activa del atleta, si tiene, pasa a inactiva (null = false)
public record AssignRoutineRequest(

        @NotNull(message = "La rutina es obligatoria")
        UUID routineId,

        Boolean replaceActive
) {

    public boolean replaceActiveOrFalse() {
        return Boolean.TRUE.equals(replaceActive);
    }
}
