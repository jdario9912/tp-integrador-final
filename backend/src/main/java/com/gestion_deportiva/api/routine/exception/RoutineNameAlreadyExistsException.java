package com.gestion_deportiva.api.routine.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

public class RoutineNameAlreadyExistsException extends ConflictException {

    public RoutineNameAlreadyExistsException(String name) {
        super("Ya tiene una rutina llamada " + name);
    }
}
