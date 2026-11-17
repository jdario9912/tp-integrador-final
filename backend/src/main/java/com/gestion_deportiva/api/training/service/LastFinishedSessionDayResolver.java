package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.service.NextRoutineDayResolver;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.training.repository.RoutineDayPosition;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// US-12 · Día que toca (contrato 9.6): el que sigue, por dayNumber, al del último entrenamiento finalizado de la
// asignación; después del último vuelve al primero. Sin finalizados, el primero. Reemplaza al provisorio de US-17.
// Vive en training porque lee las sesiones (como JpaTrainingSessionChecker), igual que el resto de los puertos JPA
@Component
@RequiredArgsConstructor
class LastFinishedSessionDayResolver implements NextRoutineDayResolver {

    private final TrainingSessionRepository trainingSessionRepository;

    // No depende del orden en que llegan los días: los ordena por dayNumber antes de elegir
    @Override
    public UUID resolve(RoutineAssignment assignment, List<RoutineDay> days) {
        List<RoutineDay> rotation = days.stream()
                .sorted(Comparator.comparingInt(RoutineDay::getDayNumber))
                .toList();
        if (rotation.isEmpty()) {
            return null;
        }
        return trainingSessionRepository.findLastFinishedRoutineDay(assignment.getId())
                .map(last -> nextAfter(rotation, last))
                .orElseGet(() -> rotation.get(0).getId());
    }

    // Si el día del último entrenamiento sigue en la rutina, toca el que le sigue en la lista (que es el que sigue por
    // dayNumber). Si ya no está, el primero con un dayNumber mayor al que tenía, o el primero si no hay ninguno
    private static UUID nextAfter(List<RoutineDay> rotation, RoutineDayPosition last) {
        for (int i = 0; i < rotation.size(); i++) {
            if (rotation.get(i).getId().equals(last.getDayId())) {
                return rotation.get((i + 1) % rotation.size()).getId();
            }
        }
        return rotation.stream()
                .filter(day -> day.getDayNumber() > last.getDayNumber())
                .findFirst()
                .orElse(rotation.get(0))
                .getId();
    }
}
