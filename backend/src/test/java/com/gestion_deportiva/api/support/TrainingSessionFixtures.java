package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.dto.StartTrainingSessionRequest;
import com.gestion_deportiva.api.training.model.TrainingSession;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

// Datos de prueba reutilizables para las sesiones de entrenamiento (US-18)
public final class TrainingSessionFixtures {

    private TrainingSessionFixtures() {
    }

    public static StartTrainingSessionRequest startRequest(UUID routineDayId) {
        return new StartTrainingSessionRequest(routineDayId);
    }

    // Sesión en progreso iniciada al mediodía de Argentina (15:00 UTC) de esa fecha: el instante y la fecha
    // coinciden en la zona de la app
    public static TrainingSession session(RoutineAssignment assignment, RoutineDay day, LocalDate sessionDate) {
        return TrainingSession.start(assignment, day, middayInArgentina(sessionDate), sessionDate);
    }

    public static Instant middayInArgentina(LocalDate date) {
        return date.atTime(15, 0).toInstant(ZoneOffset.UTC);
    }
}
