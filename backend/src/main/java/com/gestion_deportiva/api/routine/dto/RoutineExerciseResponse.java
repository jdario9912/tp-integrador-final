package com.gestion_deportiva.api.routine.dto;

import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.routine.model.RoutineExercise;

import java.math.BigDecimal;
import java.util.UUID;

public record RoutineExerciseResponse(
        UUID id,
        UUID exerciseId,
        String exerciseName,
        MuscleGroup muscleGroup,
        short sortOrder,
        short sets,
        short reps,
        BigDecimal recommendedWeight,
        // Segundos
        Short rest,
        String rirRpe,
        String techniqueNote
) {

    public static RoutineExerciseResponse from(RoutineExercise routineExercise) {
        return new RoutineExerciseResponse(
                routineExercise.getId(),
                routineExercise.getExercise().getId(),
                routineExercise.getExercise().getName(),
                routineExercise.getExercise().getMuscleGroup(),
                routineExercise.getSortOrder(),
                routineExercise.getSets(),
                routineExercise.getReps(),
                routineExercise.getRecommendedWeight(),
                routineExercise.getRest(),
                routineExercise.getRirRpe(),
                routineExercise.getTechniqueNote());
    }
}
