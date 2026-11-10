package com.gestion_deportiva.api.assignment.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

// El atleta ya tiene otra rutina activa y no se confirmó el reemplazo (replaceActive). El cliente pide
// confirmación y reintenta con replaceActive = true
public class ActiveAssignmentExistsException extends ConflictException {

    public ActiveAssignmentExistsException(String activeRoutineName) {
        super("El atleta ya tiene asignada la rutina «" + activeRoutineName + "». "
                + "Confirme el reemplazo para asignar la nueva");
    }
}
