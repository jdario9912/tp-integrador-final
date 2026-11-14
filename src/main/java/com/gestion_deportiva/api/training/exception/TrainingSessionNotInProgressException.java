package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

// La sesión ya terminó o se canceló: no se cargan ni se corrigen series (US-19, contrato 11.6). Es un 409 y no un 422:
// con la sesión cerrada, lo que corresponde es decirlo antes que validar los ejercicios
public class TrainingSessionNotInProgressException extends ConflictException {

    public static final String MESSAGE = "Ya no podés cargar ni corregir series: el entrenamiento no está en curso";

    public TrainingSessionNotInProgressException() {
        super(MESSAGE);
    }
}
