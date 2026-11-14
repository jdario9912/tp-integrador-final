package com.gestion_deportiva.api.routine.service;

import java.util.Collection;
import java.util.UUID;

// Consulta si algún ejercicio planificado ya tiene series registradas por un atleta. Las series
// (performed_sets) las implementa JpaPerformedSetChecker (US-19), en el módulo de sesiones (training)
public interface PerformedSetChecker {

    boolean hasPerformedSets(Collection<UUID> routineExerciseIds);
}
