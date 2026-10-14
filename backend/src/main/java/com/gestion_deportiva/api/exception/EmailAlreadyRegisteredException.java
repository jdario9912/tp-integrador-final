package com.gestion_deportiva.api.exception;

// Se intenta registrar un usuario con un email que ya existe.
// El GlobalExceptionHandler (US-34) la traduce a 409 Conflict.
public class EmailAlreadyRegisteredException extends RuntimeException {

    private final String email;

    public EmailAlreadyRegisteredException(String email) {
        super("Ya existe un usuario registrado con el email " + email);
        this.email = email;
    }

    public EmailAlreadyRegisteredException(String email, Throwable cause) {
        super("Ya existe un usuario registrado con el email " + email, cause);
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
