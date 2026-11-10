package com.gestion_deportiva.api.assignment.dto;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;

import java.time.LocalDate;
import java.util.UUID;

// Sin athleteId: los endpoints cuelgan de /athletes/{athleteId}. routineName evita una consulta por rutina
// para mostrar el historial
public record RoutineAssignmentResponse(
        UUID id,
        UUID routineId,
        String routineName,
        LocalDate assignmentDate,
        boolean active
) {

    public static RoutineAssignmentResponse from(RoutineAssignment assignment) {
        return new RoutineAssignmentResponse(
                assignment.getId(),
                assignment.getRoutine().getId(),
                assignment.getRoutine().getName(),
                assignment.getAssignmentDate(),
                assignment.isActive());
    }
}
