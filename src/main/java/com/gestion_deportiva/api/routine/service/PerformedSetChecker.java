package com.gestion_deportiva.api.routine.service;

import java.util.Collection;
import java.util.UUID;

// Consulta si algún ejercicio planificado ya tiene series registradas por un atleta. Las series
// (performed_sets) llegan en US-19: hasta entonces la implementación es NoPerformedSetChecker
public interface PerformedSetChecker {

    boolean hasPerformedSets(Collection<UUID> routineExerciseIds);
}
