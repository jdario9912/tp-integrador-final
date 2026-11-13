package com.gestion_deportiva.api.assignment.dto;

import com.gestion_deportiva.api.routine.dto.RoutineDayResponse;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;

import java.util.List;
import java.util.UUID;

// Rutina asignada, vista por el atleta (US-17): los datos que necesita y su estructura. Sin isTemplate ni las
// fechas de alta y edición (datos de gestión del entrenador). Los días y ejercicios son los mismos de US-14
public record AssignedRoutineResponse(
        UUID id,
        String name,
        String description,
        String goal,
        Short daysPerWeek,
        Short durationWeeks,
        List<RoutineDayResponse> days
) {

    // days: los de la rutina, ordenados y con sus ejercicios ya cargados (RoutineDayRepository). No se lee
    // routine.getDays() para no disparar otra consulta
    public static AssignedRoutineResponse from(Routine routine, List<RoutineDay> days) {
        return new AssignedRoutineResponse(
                routine.getId(),
                routine.getName(),
                routine.getDescription(),
                routine.getGoal(),
                routine.getDaysPerWeek(),
                routine.getDurationWeeks(),
                days.stream().map(RoutineDayResponse::from).toList());
    }
}
