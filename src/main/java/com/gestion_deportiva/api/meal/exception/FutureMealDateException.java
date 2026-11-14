package com.gestion_deportiva.api.meal.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// El día de la comida es posterior a "hoy" en la zona de la app (contrato 11.10): 400 con el error en "date".
// Solo aplica al alta y a la edición: el listado acepta cualquier fecha
public class FutureMealDateException extends FieldValidationException {

    public static final String FIELD = "date";
    public static final String MESSAGE = "La fecha no puede ser futura";

    public FutureMealDateException() {
        super(FIELD, MESSAGE);
    }
}
