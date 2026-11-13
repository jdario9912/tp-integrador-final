package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// El día no está entre los de la rutina activa: no existe, es de otra rutina o de una asignación anterior.
// Mismo mensaje en todos los casos: no revela si el id existe en una rutina ajena
public class RoutineDayNotInActiveRoutineException extends BusinessRuleException {

    public static final String MESSAGE = "El día elegido no pertenece a tu rutina activa";

    public RoutineDayNotInActiveRoutineException() {
        super(MESSAGE);
    }
}
