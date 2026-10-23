package com.gestion_deportiva.api.common.exception;

// 401: el cliente no pudo identificarse (credenciales o sesión inválidas). El mensaje llega al cliente.
public abstract class UnauthorizedException extends RuntimeException {

    protected UnauthorizedException(String message) {
        super(message);
    }
}
