package com.gestion_deportiva.api.user.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

public class EmailAlreadyRegisteredException extends ConflictException {

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
