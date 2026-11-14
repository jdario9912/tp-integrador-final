package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

// La sesión ya está finalizada o cancelada: no se vuelve a cerrar (US-20, contrato 14.6). Es un 409 con su propio
// mensaje; no se reutiliza TrainingSessionNotInProgressException, cuyo texto habla de las series
public class TrainingSessionAlreadyEndedException extends ConflictException {

    public static final String MESSAGE = "La sesión de entrenamiento ya no está en curso: está finalizada o cancelada";

    public TrainingSessionAlreadyEndedException() {
        super(MESSAGE);
    }
}
