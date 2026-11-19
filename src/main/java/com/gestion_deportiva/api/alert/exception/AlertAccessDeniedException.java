package com.gestion_deportiva.api.alert.exception;

import com.gestion_deportiva.api.common.exception.ForbiddenException;

// La alerta existe pero es de un atleta que no pertenece a la cartera del entrenador
public class AlertAccessDeniedException extends ForbiddenException {

    public static final String MESSAGE = "No tiene permisos para acceder a esta alerta";

    public AlertAccessDeniedException() {
        super(MESSAGE);
    }
}
