package com.gestion_deportiva.api.assignment.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// El atleta no puede recibir rutinas: está desactivado o desvinculado de su entrenador
public class AthleteNotAssignableException extends BusinessRuleException {

    public static final String INACTIVE_MESSAGE = "No se puede asignar una rutina a un atleta desactivado";
    public static final String UNLINKED_MESSAGE = "No se puede asignar una rutina a un atleta desvinculado";

    private AthleteNotAssignableException(String message) {
        super(message);
    }

    public static AthleteNotAssignableException inactive() {
        return new AthleteNotAssignableException(INACTIVE_MESSAGE);
    }

    public static AthleteNotAssignableException unlinked() {
        return new AthleteNotAssignableException(UNLINKED_MESSAGE);
    }
}
