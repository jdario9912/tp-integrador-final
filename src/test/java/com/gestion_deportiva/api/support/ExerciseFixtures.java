package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.dto.ExerciseRequest;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;

// Datos de prueba reutilizables para el catálogo de ejercicios (US-38)
public final class ExerciseFixtures {

    public static final String VIDEO_URL = "https://www.youtube.com/watch?v=abc123";

    private ExerciseFixtures() {
    }

    // coach null = ejercicio global (del sistema)
    public static Exercise exercise(String name, MuscleGroup muscleGroup, Coach coach) {
        return Exercise.builder()
                .name(name)
                .muscleGroup(muscleGroup)
                .createdBy(coach)
                .build();
    }

    // Request válido con todos los campos completos
    public static ExerciseRequest exerciseRequest(String name) {
        return new ExerciseRequest(name, MuscleGroup.CHEST, "Bajar la barra al pecho y empujar", VIDEO_URL);
    }

    // Solo los campos obligatorios
    public static ExerciseRequest exerciseRequestWithOnlyRequired(String name) {
        return new ExerciseRequest(name, MuscleGroup.CHEST, null, null);
    }
}
