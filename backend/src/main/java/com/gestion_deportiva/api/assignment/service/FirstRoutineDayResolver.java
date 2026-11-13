package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// Todavía no existen los entrenamientos (US-18/US-20): siempre toca el primer día de la rutina.
// Reemplazar por el cálculo con el último entrenamiento finalizado cuando existan
@Component
class FirstRoutineDayResolver implements NextRoutineDayResolver {

    // Busca el menor dayNumber en lugar de tomar el primero de la lista: no depende del orden en que llegan
    @Override
    public UUID resolve(RoutineAssignment assignment, List<RoutineDay> days) {
        return days.stream()
                .min(Comparator.comparingInt(RoutineDay::getDayNumber))
                .map(RoutineDay::getId)
                .orElse(null);
    }
}
