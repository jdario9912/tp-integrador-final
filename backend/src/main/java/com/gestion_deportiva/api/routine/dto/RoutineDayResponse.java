package com.gestion_deportiva.api.routine.dto;

import com.gestion_deportiva.api.routine.model.RoutineDay;

import java.util.List;
import java.util.UUID;

public record RoutineDayResponse(
        UUID id,
        short dayNumber,
        String name,
        List<RoutineExerciseResponse> exercises
) {

    public static RoutineDayResponse from(RoutineDay day) {
        return new RoutineDayResponse(
                day.getId(),
                day.getDayNumber(),
                day.getName(),
                day.getExercises().stream().map(RoutineExerciseResponse::from).toList());
    }
}
