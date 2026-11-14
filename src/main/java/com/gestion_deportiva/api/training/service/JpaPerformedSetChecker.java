package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.routine.service.PerformedSetChecker;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.UUID;

// Implementación de PerformedSetChecker sobre performed_sets (US-19): reemplaza al NoPerformedSetChecker provisorio.
// Quitar de la estructura un ejercicio con series registradas responde 422 (RoutineHasPerformedSetsException)
@Component
@RequiredArgsConstructor
class JpaPerformedSetChecker implements PerformedSetChecker {

    private final PerformedSetRepository performedSetRepository;

    // Sin ejercicios no hay nada que consultar (y un IN vacío no aporta nada)
    @Override
    public boolean hasPerformedSets(Collection<UUID> routineExerciseIds) {
        return !routineExerciseIds.isEmpty() && performedSetRepository.existsByRoutineExerciseIdIn(routineExerciseIds);
    }
}
