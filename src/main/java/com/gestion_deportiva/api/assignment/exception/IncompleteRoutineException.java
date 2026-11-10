package com.gestion_deportiva.api.assignment.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// La rutina no tiene días o tiene algún día sin ejercicios (Routine.isComplete)
public class IncompleteRoutineException extends BusinessRuleException {

    public static final String MESSAGE = "La rutina no tiene días o tiene días sin ejercicios. "
            + "Complete su estructura antes de asignarla";

    public IncompleteRoutineException() {
        super(MESSAGE);
    }
}
