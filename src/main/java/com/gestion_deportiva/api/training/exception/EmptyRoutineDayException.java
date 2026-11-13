package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// El día no tiene ejercicios (el entrenador lo vació después de asignar la rutina): no habría nada que registrar
public class EmptyRoutineDayException extends BusinessRuleException {

    public static final String MESSAGE = "El día elegido no tiene ejercicios cargados";

    public EmptyRoutineDayException() {
        super(MESSAGE);
    }
}
