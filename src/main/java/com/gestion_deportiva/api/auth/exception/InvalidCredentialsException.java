package com.gestion_deportiva.api.auth.exception;

import com.gestion_deportiva.api.common.exception.UnauthorizedException;

// Mismo mensaje para email inexistente y contraseña incorrecta: no revela si el email está registrado
public class InvalidCredentialsException extends UnauthorizedException {

    public static final String MESSAGE = "Email o contraseña incorrectos";

    public InvalidCredentialsException() {
        super(MESSAGE);
    }
}
