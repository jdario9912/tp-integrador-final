package com.gestion_deportiva.api.meal.dto;

import com.gestion_deportiva.api.meal.model.Meal;
import jakarta.validation.constraints.Size;

// US-25 · Body de la revisión de una comida. Todo opcional: se puede marcar la comida como revisada sin texto. El
// comentario se recorta antes de validar el largo (la validación corre sobre el valor del constructor compacto)
public record ReviewMealRequest(

        @Size(max = Meal.MAX_OBSERVATION_LENGTH, message = "El comentario no puede superar los 1000 caracteres")
        String observation
) {

    public ReviewMealRequest {
        observation = observation == null || observation.isBlank() ? null : observation.strip();
    }
}
