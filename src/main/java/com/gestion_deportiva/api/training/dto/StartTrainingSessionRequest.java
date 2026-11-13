package com.gestion_deportiva.api.training.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// Iniciar el entrenamiento de un día (US-18). Sin athleteId: sale de la ruta. La fecha y la hora las pone el backend
public record StartTrainingSessionRequest(

        @NotNull(message = "El día de la rutina es obligatorio")
        UUID routineDayId
) {
}
