package com.gestion_deportiva.api.routine.dto;

import com.gestion_deportiva.api.common.validation.ValidRirRpe;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

// Ejercicio de un día (US-14). Con id conserva uno existente del mismo día; sin id crea uno nuevo
public record RoutineExerciseRequest(

        UUID id,

        @NotNull(message = "El ejercicio es obligatorio")
        UUID exerciseId,

        @NotNull(message = "Las series son obligatorias")
        @Min(value = 1, message = "Las series deben estar entre 1 y 99")
        @Max(value = 99, message = "Las series deben estar entre 1 y 99")
        Integer sets,

        @NotNull(message = "Las repeticiones son obligatorias")
        @Min(value = 1, message = "Las repeticiones deben estar entre 1 y 999")
        @Max(value = 999, message = "Las repeticiones deben estar entre 1 y 999")
        Integer reps,

        // numeric(6,2) en la base: hasta 4 enteros y 2 decimales
        @DecimalMin(value = "0", message = "El peso recomendado debe estar entre 0 y 1000 kg")
        @DecimalMax(value = "1000", message = "El peso recomendado debe estar entre 0 y 1000 kg")
        @Digits(integer = 4, fraction = 2, message = "El peso recomendado admite hasta 2 decimales")
        BigDecimal recommendedWeight,

        // Segundos
        @Min(value = 0, message = "El descanso debe estar entre 0 y 3600 segundos")
        @Max(value = 3600, message = "El descanso debe estar entre 0 y 3600 segundos")
        Integer rest,

        @ValidRirRpe
        @Size(max = 10, message = "El RIR/RPE no puede superar los 10 caracteres")
        String rirRpe,

        @Size(max = 500, message = "La nota técnica no puede superar los 500 caracteres")
        String techniqueNote
) {
}
