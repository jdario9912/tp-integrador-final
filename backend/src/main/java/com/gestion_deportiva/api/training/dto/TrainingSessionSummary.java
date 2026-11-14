package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SetStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

// Resumen de la sesión (US-20, contrato 14.2 y 14.4): lo prescrito del día contra lo registrado en las series. No se
// guarda: se calcula de la sesión y sus series, así que sirve igual en progreso que finalizada o cancelada
public record TrainingSessionSummary(
        // Suma de los sets de los ejercicios del día
        int prescribedSets,
        int doneSets,
        int skippedSets,
        // Prescritas sin registrar. Nunca es negativo: si el entrenador bajó las series de un ejercicio después de que
        // el atleta registrara algunas, el pendiente se queda en 0 y no en un número negativo
        int pendingSets,
        // Σ weight × reps de las series realizadas, con dos decimales
        BigDecimal volumeKg
) {

    private static final int VOLUME_SCALE = 2;

    // La sesión tiene que traer el día con sus ejercicios (lo carga la consulta de la sesión o el alta)
    public static TrainingSessionSummary from(TrainingSession session, List<PerformedSet> performedSets) {
        int prescribed = session.getRoutineDay().getExercises().stream()
                .mapToInt(RoutineExercise::getSets)
                .sum();
        int done = countWithStatus(performedSets, SetStatus.DONE);
        int skipped = countWithStatus(performedSets, SetStatus.SKIPPED);
        int pending = Math.max(0, prescribed - done - skipped);
        return new TrainingSessionSummary(prescribed, done, skipped, pending, volumeOf(performedSets));
    }

    private static int countWithStatus(List<PerformedSet> performedSets, SetStatus status) {
        return (int) performedSets.stream()
                .filter(set -> set.getStatus() == status)
                .count();
    }

    // Las series omitidas no tienen peso ni repeticiones: solo suman las realizadas (la base garantiza ambos datos)
    private static BigDecimal volumeOf(List<PerformedSet> performedSets) {
        return performedSets.stream()
                .filter(set -> set.getStatus() == SetStatus.DONE)
                .map(set -> set.getWeightKg().multiply(BigDecimal.valueOf(set.getReps())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(VOLUME_SCALE, RoundingMode.HALF_UP);
    }
}
