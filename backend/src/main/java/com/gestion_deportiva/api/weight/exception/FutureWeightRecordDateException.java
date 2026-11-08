package com.gestion_deportiva.api.weight.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// La fecha del registro es posterior a "hoy" en la zona de la app (contrato 8.8): 400 con el error en "date"
public class FutureWeightRecordDateException extends FieldValidationException {

    public static final String FIELD = "date";
    public static final String MESSAGE = "La fecha no puede ser futura";

    public FutureWeightRecordDateException() {
        super(FIELD, MESSAGE);
    }
}
