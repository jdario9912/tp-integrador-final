package com.gestion_deportiva.api.common.exception;

// 400 sin un campo puntual: la solicitud es inválida como un todo (ej. un enlace de recuperación vencido, US-44).
// El mensaje llega al cliente y la respuesta no trae fieldErrors
public abstract class BadRequestException extends RuntimeException {

    protected BadRequestException(String message) {
        super(message);
    }
}
