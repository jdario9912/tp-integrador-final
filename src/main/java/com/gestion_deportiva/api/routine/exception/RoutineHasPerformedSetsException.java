package com.gestion_deportiva.api.routine.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// Se quiso quitar un día o un ejercicio que el atleta ya entrenó: borrarlo dejaría sesiones sin su plan
public class RoutineHasPerformedSetsException extends BusinessRuleException {

    public RoutineHasPerformedSetsException() {
        super("No se pueden quitar días o ejercicios que ya tienen series registradas. "
                + "Duplique la rutina y edite la copia");
    }
}
