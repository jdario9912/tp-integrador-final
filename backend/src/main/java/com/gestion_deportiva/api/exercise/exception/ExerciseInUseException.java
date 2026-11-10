package com.gestion_deportiva.api.exercise.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// El ejercicio está planificado en alguna rutina: darlo de baja la dejaría con un ejercicio fuera del catálogo
public class ExerciseInUseException extends BusinessRuleException {

    public ExerciseInUseException() {
        super("No se puede eliminar el ejercicio porque se usa en una o más rutinas. Quítelo de las rutinas primero");
    }
}
