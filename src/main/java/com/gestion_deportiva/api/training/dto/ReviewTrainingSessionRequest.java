package com.gestion_deportiva.api.training.dto;

import jakarta.validation.constraints.Size;

// US-21 · Body de la revisión (contrato 15.4). Todo opcional: se puede marcar la sesión como revisada sin texto. La
// observación se recorta antes de validar el largo (la validación corre sobre el valor del constructor compacto)
public record ReviewTrainingSessionRequest(

        @Size(max = 1000, message = "La observación no puede superar los 1000 caracteres")
        String observation
) {

    public ReviewTrainingSessionRequest {
        observation = observation == null || observation.isBlank() ? null : observation.strip();
    }
}
