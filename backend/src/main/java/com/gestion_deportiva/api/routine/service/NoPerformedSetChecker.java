package com.gestion_deportiva.api.routine.service;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.UUID;

// Todavía no existen series registradas (US-19): ningún ejercicio las tiene.
// Reemplazar por la consulta a performed_sets cuando exista la tabla
@Component
class NoPerformedSetChecker implements PerformedSetChecker {

    @Override
    public boolean hasPerformedSets(Collection<UUID> routineExerciseIds) {
        return false;
    }
}
