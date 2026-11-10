package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.routine.dto.RoutineDayRequest;
import com.gestion_deportiva.api.routine.dto.RoutineExerciseRequest;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.dto.RoutineStructureRequest;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineExercise;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

// Datos de prueba reutilizables para las rutinas (US-13 a US-15)
public final class RoutineFixtures {

    private RoutineFixtures() {
    }

    public static Routine routine(String name, Coach coach) {
        return new Routine(name, coach);
    }

    // Request válido con todos los campos completos
    public static RoutineRequest routineRequest(String name) {
        return new RoutineRequest(name, "Rutina de fuerza en bloques", "Hipertrofia", (short) 4, (short) 8, true);
    }

    // Solo los campos obligatorios
    public static RoutineRequest routineRequestWithOnlyRequired(String name) {
        return new RoutineRequest(name, null, null, null, null, null);
    }

    // Ejercicio planificado con todos los parámetros
    public static RoutineExercise routineExercise(Exercise exercise) {
        return RoutineExercise.builder()
                .exercise(exercise)
                .sets((short) 4)
                .reps((short) 10)
                .recommendedWeight(new BigDecimal("60.50"))
                .rest((short) 90)
                .rirRpe("RIR 2")
                .techniqueNote("Bajar en 3 segundos")
                .build();
    }

    public static RoutineStructureRequest structure(RoutineDayRequest... days) {
        return new RoutineStructureRequest(List.of(days));
    }

    public static RoutineDayRequest day(UUID id, String name, RoutineExerciseRequest... exercises) {
        return new RoutineDayRequest(id, name, List.of(exercises));
    }

    // Ejercicio con todos los parámetros (id null = nuevo)
    public static RoutineExerciseRequest exerciseRequest(UUID id, UUID exerciseId) {
        return new RoutineExerciseRequest(id, exerciseId, 4, 10, new BigDecimal("60.5"), 90, "RIR 2",
                "Bajar en 3 segundos");
    }

    // Solo los campos obligatorios
    public static RoutineExerciseRequest exerciseRequestWithOnlyRequired(UUID id, UUID exerciseId) {
        return new RoutineExerciseRequest(id, exerciseId, 3, 12, null, null, null, null);
    }
}
