package com.gestion_deportiva.api.common.exception;

// 403: el cliente está identificado pero no puede realizar la operación. El mensaje llega al cliente.
public abstract class ForbiddenException extends RuntimeException {

    protected ForbiddenException(String message) {
        super(message);
    }
}
