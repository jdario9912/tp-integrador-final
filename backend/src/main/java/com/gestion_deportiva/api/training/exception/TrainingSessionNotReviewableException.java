package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// US-21 · Solo se revisa una sesión finalizada (contrato 15.6): en progreso o cancelada es un 422, una regla de negocio
// (y no un 409: la sesión está bien, lo que no corresponde es revisarla)
public class TrainingSessionNotReviewableException extends BusinessRuleException {

    public static final String MESSAGE = "Solo se puede revisar una sesión finalizada";

    public TrainingSessionNotReviewableException() {
        super(MESSAGE);
    }
}
