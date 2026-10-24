package com.gestion_deportiva.api.athlete.exception;

import com.gestion_deportiva.api.common.exception.ForbiddenException;

// El atleta existe pero no le pertenece a quien lo pide: atleta de otro entrenador, desvinculado u otro atleta
public class AthleteAccessDeniedException extends ForbiddenException {

    public static final String MESSAGE = "No tiene permisos para acceder a este atleta";

    public AthleteAccessDeniedException() {
        super(MESSAGE);
    }
}
