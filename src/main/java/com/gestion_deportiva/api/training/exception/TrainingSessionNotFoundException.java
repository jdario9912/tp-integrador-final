package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

// La sesión no existe o es de otro atleta: la misma respuesta en los dos casos (contrato 10.5)
public class TrainingSessionNotFoundException extends ResourceNotFoundException {

    public TrainingSessionNotFoundException(UUID sessionId) {
        super("No existe la sesión de entrenamiento con id " + sessionId);
    }
}
