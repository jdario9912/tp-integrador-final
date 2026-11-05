package com.gestion_deportiva.api.exercise.dto;

import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;

import java.util.UUID;

public record ExerciseResponse(
        UUID id,
        String name,
        String description,
        MuscleGroup muscleGroup,
        String videoUrl,
        // true = ejercicio del sistema: solo lectura. El listado solo trae globales y propios, así que
        // false significa "del entrenador autenticado"
        boolean global
) {

    public static ExerciseResponse from(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getDescription(),
                exercise.getMuscleGroup(),
                exercise.getVideoUrl(),
                exercise.isGlobal());
    }
}
