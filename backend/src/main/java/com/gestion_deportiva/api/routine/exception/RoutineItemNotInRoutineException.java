package com.gestion_deportiva.api.routine.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// El id de un día o de un ejercicio de la estructura no corresponde a la rutina (o al día) que se está editando
public class RoutineItemNotInRoutineException extends FieldValidationException {

    private RoutineItemNotInRoutineException(String field, String message) {
        super(field, message);
    }

    public static RoutineItemNotInRoutineException day(String field) {
        return new RoutineItemNotInRoutineException(field, "El día no pertenece a la rutina");
    }

    public static RoutineItemNotInRoutineException exercise(String field) {
        return new RoutineItemNotInRoutineException(field, "El ejercicio no pertenece a este día de la rutina");
    }

    public static RoutineItemNotInRoutineException repeated(String field) {
        return new RoutineItemNotInRoutineException(field, "El id está repetido en la estructura");
    }
}
