package com.gestion_deportiva.api.auth.exception;

import com.gestion_deportiva.api.common.exception.BadRequestException;

// Token inexistente, vencido o ya usado: el mismo mensaje en los tres casos
public class InvalidPasswordResetTokenException extends BadRequestException {

    public static final String MESSAGE = "El enlace de recuperación no es válido o venció. Solicite uno nuevo";

    public InvalidPasswordResetTokenException() {
        super(MESSAGE);
    }
}
