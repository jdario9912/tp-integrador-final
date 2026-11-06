package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.model.Routine;

// Datos de prueba reutilizables para las rutinas (US-13)
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
}
