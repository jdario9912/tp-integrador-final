package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.routine.service.TrainingSessionChecker;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.UUID;

// Implementación de TrainingSessionChecker para la edición de la estructura de la rutina (US-14, regla de US-18)
@Component
@RequiredArgsConstructor
class JpaTrainingSessionChecker implements TrainingSessionChecker {

    private final TrainingSessionRepository trainingSessionRepository;

    // Sin días no hay nada que consultar (y un IN vacío no aporta nada)
    @Override
    public boolean hasTrainingSessions(Collection<UUID> routineDayIds) {
        return !routineDayIds.isEmpty() && trainingSessionRepository.existsByRoutineDayIdIn(routineDayIds);
    }
}
