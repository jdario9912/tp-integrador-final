package com.gestion_deportiva.api.user.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// US-48 · La nueva contraseña es igual a la actual: 400 con el error en "newPassword"
public class SamePasswordException extends FieldValidationException {

    public static final String FIELD = "newPassword";
    public static final String MESSAGE = "La nueva contraseña debe ser distinta de la actual";

    public SamePasswordException() {
        super(FIELD, MESSAGE);
    }
}
