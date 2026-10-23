package com.gestion_deportiva.api.auth.exception;

import com.gestion_deportiva.api.common.exception.ForbiddenException;

public class AccountDisabledException extends ForbiddenException {

    public static final String MESSAGE = "Tu cuenta está desactivada";

    public AccountDisabledException() {
        super(MESSAGE);
    }
}
