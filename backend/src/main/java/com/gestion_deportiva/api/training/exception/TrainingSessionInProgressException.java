package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

// El atleta ya tiene una sesión en progreso (una sola por atleta). El cliente pide la sesión en progreso y ofrece
// retomarla: el 409 no trae su id (no cambia el formato de ApiErrorResponse)
public class TrainingSessionInProgressException extends ConflictException {

    public static final String MESSAGE = "Ya tenés un entrenamiento en curso. Retomalo para continuar";

    public TrainingSessionInProgressException() {
        super(MESSAGE);
    }
}
