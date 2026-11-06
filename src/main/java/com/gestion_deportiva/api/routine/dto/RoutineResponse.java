package com.gestion_deportiva.api.routine.dto;

import com.gestion_deportiva.api.routine.model.Routine;

import java.time.Instant;
import java.util.UUID;

public record RoutineResponse(
        UUID id,
        String name,
        String description,
        String goal,
        Short daysPerWeek,
        Short durationWeeks,
        boolean isTemplate,
        Instant createdAt
) {

    public static RoutineResponse from(Routine routine) {
        return new RoutineResponse(
                routine.getId(),
                routine.getName(),
                routine.getDescription(),
                routine.getGoal(),
                routine.getDaysPerWeek(),
                routine.getDurationWeeks(),
                routine.isTemplate(),
                routine.getCreatedAt());
    }
}
