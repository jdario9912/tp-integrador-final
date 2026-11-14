package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.training.model.PerformedSet;
import com.gestion_deportiva.api.training.model.enums.SetStatus;

import java.math.BigDecimal;
import java.util.UUID;

// Serie registrada (US-19, contrato 11.4). Los campos que no aplican al estado van en null: peso, reps y RPE en
// SKIPPED, el motivo en DONE
public record PerformedSetResponse(
        UUID id,
        // Ejercicio del día (day.exercises[].id de la sesión), no el del catálogo
        UUID routineExerciseId,
        short setNumber,
        SetStatus status,
        // Kilos con dos decimales (mismo formato que recommendedWeight)
        BigDecimal weight,
        Short reps,
        // Opcional: null si no se cargó
        Short rpe,
        String skipReason
) {

    public static PerformedSetResponse from(PerformedSet set) {
        return new PerformedSetResponse(
                set.getId(),
                set.getRoutineExercise().getId(),
                set.getSetNumber(),
                set.getStatus(),
                set.getWeightKg(),
                set.getReps(),
                set.getRpe(),
                set.getSkipReason());
    }
}
