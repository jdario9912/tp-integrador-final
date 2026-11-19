package com.gestion_deportiva.api.alert.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

public class AlertAlreadyHandledException extends ConflictException {

    public static final String MESSAGE = "La alerta ya fue atendida";

    public AlertAlreadyHandledException() {
        super(MESSAGE);
    }
}
