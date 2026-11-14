package com.gestion_deportiva.api.common.upload.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// El archivo falta, está vacío o tiene cabecera de imagen pero no es una imagen válida (truncada o dañada).
// 400 con el error en el campo "file"
public class InvalidImageException extends FieldValidationException {

    public static final String FIELD = "file";
    public static final String MISSING_MESSAGE = "Adjuntá una foto";
    public static final String CORRUPT_MESSAGE = "El archivo no es una imagen válida. Probá con otra foto";

    private InvalidImageException(String message) {
        super(FIELD, message);
    }

    public static InvalidImageException missing() {
        return new InvalidImageException(MISSING_MESSAGE);
    }

    public static InvalidImageException corrupt() {
        return new InvalidImageException(CORRUPT_MESSAGE);
    }
}
