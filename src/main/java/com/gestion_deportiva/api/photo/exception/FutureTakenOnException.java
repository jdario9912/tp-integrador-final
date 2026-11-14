package com.gestion_deportiva.api.photo.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// "takenOn" posterior a "hoy" en la zona de la app (APP_TIME_ZONE): 400 con el error en "takenOn"
public class FutureTakenOnException extends FieldValidationException {

    public static final String FIELD = "takenOn";
    public static final String MESSAGE = "La fecha no puede ser futura";

    public FutureTakenOnException() {
        super(FIELD, MESSAGE);
    }
}
