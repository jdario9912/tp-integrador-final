package com.gestion_deportiva.api.routine.service;

import java.util.Collection;
import java.util.UUID;

// Consulta si algún día de la rutina ya tiene sesiones de entrenamiento (US-18), en cualquier estado. Un día con
// sesiones no se puede quitar: las sesiones apuntan a él. La implementa el módulo de sesiones (training), así
// routine no depende de él (mismo patrón que PerformedSetChecker)
public interface TrainingSessionChecker {

    boolean hasTrainingSessions(Collection<UUID> routineDayIds);
}
