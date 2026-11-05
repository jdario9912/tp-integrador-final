package com.gestion_deportiva.api.exercise.dto;

import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Alta y edición de un ejercicio (US-38). En la edición reemplaza todo: los opcionales que no vengan quedan en null
public record ExerciseRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String name,

        @NotNull(message = "El grupo muscular es obligatorio")
        MuscleGroup muscleGroup,

        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String description,

        // Vacío = sin video. Solo http/https: evita javascript: y otros esquemas en un link que abre el front
        @Size(max = 500, message = "La URL del video no puede superar los 500 caracteres")
        @Pattern(regexp = "^$|^https?://[^\\s/?#]+[^\\s]*$", flags = Pattern.Flag.CASE_INSENSITIVE,
                message = "La URL del video debe ser una dirección http:// o https:// válida")
        String videoUrl
) {
}
