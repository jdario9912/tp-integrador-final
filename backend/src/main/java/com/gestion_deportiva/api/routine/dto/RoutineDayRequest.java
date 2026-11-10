package com.gestion_deportiva.api.routine.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

// Día de la rutina (US-14). Con id conserva un día existente; sin id crea uno nuevo.
// El orden de la lista define la posición de cada ejercicio. exercises ausente = día sin ejercicios
public record RoutineDayRequest(

        UUID id,

        @NotBlank(message = "El nombre del día es obligatorio")
        @Size(max = 100, message = "El nombre del día no puede superar los 100 caracteres")
        String name,

        @Size(max = 30, message = "Un día no puede tener más de 30 ejercicios")
        List<@NotNull(message = "El ejercicio es obligatorio") @Valid RoutineExerciseRequest> exercises
) {

    public List<RoutineExerciseRequest> exercisesOrEmpty() {
        return exercises == null ? List.of() : exercises;
    }
}
