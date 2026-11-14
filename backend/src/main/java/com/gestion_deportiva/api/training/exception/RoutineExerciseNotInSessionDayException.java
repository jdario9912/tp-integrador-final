package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// El ejercicio no es de ese día de la sesión (o no existe): mismo mensaje en los dos casos (US-19, contrato 11.6)
public class RoutineExerciseNotInSessionDayException extends BusinessRuleException {

    public static final String MESSAGE = "El ejercicio no es de este día de entrenamiento";

    public RoutineExerciseNotInSessionDayException() {
        super(MESSAGE);
    }
}
