package com.gestion_deportiva.api.photo.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// "takenOn" con otro formato que AAAA-MM-DD o una fecha que no existe: 400 con el error en "takenOn"
public class InvalidTakenOnException extends FieldValidationException {

    public static final String FIELD = "takenOn";
    public static final String MESSAGE = "La fecha debe tener el formato AAAA-MM-DD";

    public InvalidTakenOnException() {
        super(FIELD, MESSAGE);
    }
}
