package com.gestion_deportiva.api.assignment.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.routine.model.RoutineDay;

import java.util.List;
import java.util.UUID;

// Día que le toca al atleta en su rutina activa (US-17): el siguiente en la rotación, es decir, el que sigue al del
// último entrenamiento finalizado (después del último día vuelve al primero). Los entrenamientos llegan con
// US-18/US-20: hasta entonces la implementación es FirstRoutineDayResolver
public interface NextRoutineDayResolver {

    // days: los días de la rutina asignada, ordenados por dayNumber. Devuelve el id de uno de ellos, o null si la
    // rutina no tiene días
    UUID resolve(RoutineAssignment assignment, List<RoutineDay> days);
}
