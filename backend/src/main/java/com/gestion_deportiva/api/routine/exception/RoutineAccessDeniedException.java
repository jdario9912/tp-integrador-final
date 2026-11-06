package com.gestion_deportiva.api.routine.exception;

import com.gestion_deportiva.api.common.exception.ForbiddenException;

// La rutina existe pero es de otro entrenador
public class RoutineAccessDeniedException extends ForbiddenException {

    public static final String NOT_OWNER_MESSAGE = "No tiene permisos para acceder a esta rutina";

    private RoutineAccessDeniedException(String message) {
        super(message);
    }

    public static RoutineAccessDeniedException notOwner() {
        return new RoutineAccessDeniedException(NOT_OWNER_MESSAGE);
    }
}
