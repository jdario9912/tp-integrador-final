package com.gestion_deportiva.api.exercise.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

public class ExerciseNotFoundException extends ResourceNotFoundException {

    public ExerciseNotFoundException(UUID exerciseId) {
        super("No existe el ejercicio con id " + exerciseId);
    }
}
