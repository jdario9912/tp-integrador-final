package com.gestion_deportiva.api.common.exception;

import java.util.Objects;

// Error de validación de un campo que Bean Validation no puede resolver solo (por ejemplo, porque depende del
// reloj o de la configuración) y que valida el service. Responde igual que Bean Validation: 400 con
// "La solicitud tiene campos inválidos" y el campo en fieldErrors
public abstract class FieldValidationException extends RuntimeException {

    private final String field;

    protected FieldValidationException(String field, String message) {
        super(message);
        this.field = Objects.requireNonNull(field, "field");
    }

    // Nombre del campo en el JSON o en el query param
    public String getField() {
        return field;
    }
}
