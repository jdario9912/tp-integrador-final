package com.gestion_deportiva.api.exercise.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

public class ExerciseNameAlreadyExistsException extends ConflictException {

    public ExerciseNameAlreadyExistsException(String name) {
        super("Ya existe un ejercicio llamado " + name + " en su catálogo");
    }
}
