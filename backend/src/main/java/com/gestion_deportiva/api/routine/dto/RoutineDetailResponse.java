package com.gestion_deportiva.api.routine.dto;

import com.gestion_deportiva.api.routine.model.Routine;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Detalle de la rutina con su estructura (US-14). El listado usa RoutineResponse, sin los días
public record RoutineDetailResponse(
        UUID id,
        String name,
        String description,
        String goal,
        Short daysPerWeek,
        Short durationWeeks,
        boolean isTemplate,
        Instant createdAt,
        List<RoutineDayResponse> days
) {

    public static RoutineDetailResponse from(Routine routine) {
        return new RoutineDetailResponse(
                routine.getId(),
                routine.getName(),
                routine.getDescription(),
                routine.getGoal(),
                routine.getDaysPerWeek(),
                routine.getDurationWeeks(),
                routine.isTemplate(),
                routine.getCreatedAt(),
                routine.getDays().stream().map(RoutineDayResponse::from).toList());
    }
}
