package com.gestion_deportiva.api.exercise.dto;

import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import jakarta.validation.constraints.Size;

// Filtros opcionales del catálogo (US-38), tomados de los query params. Vacíos o en blanco no filtran
public record ExerciseSearchFilter(

        @Size(max = 100, message = "La búsqueda por nombre no puede superar los 100 caracteres")
        String name,

        MuscleGroup muscleGroup
) {
}
