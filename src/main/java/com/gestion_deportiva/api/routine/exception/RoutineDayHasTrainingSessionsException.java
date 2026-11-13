package com.gestion_deportiva.api.routine.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// Se quiso quitar un día que el atleta ya entrenó (US-18): las sesiones de entrenamiento apuntan a él y borrarlo
// perdería la historia
public class RoutineDayHasTrainingSessionsException extends BusinessRuleException {

    public static final String MESSAGE = "No se pueden quitar días que ya tienen entrenamientos registrados. "
            + "Duplique la rutina y edite la copia";

    public RoutineDayHasTrainingSessionsException() {
        super(MESSAGE);
    }
}
