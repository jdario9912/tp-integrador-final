package com.gestion_deportiva.api.routine.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

public class RoutineNotFoundException extends ResourceNotFoundException {

    public RoutineNotFoundException(UUID routineId) {
        super("No existe la rutina con id " + routineId);
    }
}
