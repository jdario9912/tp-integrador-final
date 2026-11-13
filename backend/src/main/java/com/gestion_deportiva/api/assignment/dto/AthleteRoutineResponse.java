package com.gestion_deportiva.api.assignment.dto;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.routine.model.RoutineDay;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Rutina activa del atleta (US-17): la asignación con su vigencia, el día que toca y la rutina completa.
// Sin athleteId: el endpoint cuelga de /athletes/{athleteId}
public record AthleteRoutineResponse(
        UUID assignmentId,
        LocalDate assignmentDate,
        // Último día vigente; null = la rutina no tiene duración y no vence
        LocalDate endDate,
        boolean expired,
        // Id de uno de routine.days; null solo si la rutina no tiene días
        UUID nextDayId,
        AssignedRoutineResponse routine
) {

    // today: "hoy" en la zona de la app. days: los de la rutina asignada, ordenados y con sus ejercicios
    public static AthleteRoutineResponse from(RoutineAssignment assignment, List<RoutineDay> days, LocalDate today,
                                              UUID nextDayId) {
        return new AthleteRoutineResponse(
                assignment.getId(),
                assignment.getAssignmentDate(),
                assignment.endDate(),
                assignment.isExpiredOn(today),
                nextDayId,
                AssignedRoutineResponse.from(assignment.getRoutine(), days));
    }
}
