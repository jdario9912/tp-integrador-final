package com.gestion_deportiva.api.photo.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// "type" ausente o distinto de FRONT, SIDE o BACK: 400 con el error en "type"
public class InvalidProgressPhotoTypeException extends FieldValidationException {

    public static final String FIELD = "type";
    public static final String MESSAGE = "El tipo de foto no es válido";

    public InvalidProgressPhotoTypeException() {
        super(FIELD, MESSAGE);
    }
}
