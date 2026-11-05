package com.gestion_deportiva.api.exercise.exception;

import com.gestion_deportiva.api.common.exception.ForbiddenException;

// El ejercicio existe pero quien llama no puede usarlo: es de otro entrenador, o es global y se intenta modificar
public class ExerciseAccessDeniedException extends ForbiddenException {

    public static final String NOT_OWNER_MESSAGE = "No tiene permisos para acceder a este ejercicio";
    public static final String GLOBAL_MESSAGE = "Los ejercicios del sistema no se pueden modificar";

    private ExerciseAccessDeniedException(String message) {
        super(message);
    }

    public static ExerciseAccessDeniedException notOwner() {
        return new ExerciseAccessDeniedException(NOT_OWNER_MESSAGE);
    }

    public static ExerciseAccessDeniedException global() {
        return new ExerciseAccessDeniedException(GLOBAL_MESSAGE);
    }
}
