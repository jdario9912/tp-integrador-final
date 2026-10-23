package com.gestion_deportiva.api.auth.exception;

import com.gestion_deportiva.api.common.exception.UnauthorizedException;

// Refresh token inválido, vencido o ya usado, o usuario del token inexistente: hay que volver a iniciar sesión
public class SessionExpiredException extends UnauthorizedException {

    public static final String MESSAGE = "La sesión expiró. Iniciá sesión nuevamente";

    public SessionExpiredException() {
        super(MESSAGE);
    }
}
