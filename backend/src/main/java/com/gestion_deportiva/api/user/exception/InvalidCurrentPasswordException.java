package com.gestion_deportiva.api.user.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// US-48 · La contraseña actual no coincide: 400 con el error en "currentPassword". El mensaje no dice nada más
public class InvalidCurrentPasswordException extends FieldValidationException {

    public static final String FIELD = "currentPassword";
    public static final String MESSAGE = "La contraseña actual no es correcta";

    public InvalidCurrentPasswordException() {
        super(FIELD, MESSAGE);
    }
}
