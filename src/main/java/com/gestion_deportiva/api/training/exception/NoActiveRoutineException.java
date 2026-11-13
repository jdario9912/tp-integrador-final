package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// El atleta no tiene una rutina asignada activa: no hay días para entrenar
public class NoActiveRoutineException extends BusinessRuleException {

    public static final String MESSAGE = "No tenés una rutina activa para iniciar un entrenamiento";

    public NoActiveRoutineException() {
        super(MESSAGE);
    }
}
