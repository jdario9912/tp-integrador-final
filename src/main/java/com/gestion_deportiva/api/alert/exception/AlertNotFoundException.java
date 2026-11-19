package com.gestion_deportiva.api.alert.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

public class AlertNotFoundException extends ResourceNotFoundException {

    public AlertNotFoundException(UUID alertId) {
        super("No existe la alerta con id " + alertId);
    }
}
