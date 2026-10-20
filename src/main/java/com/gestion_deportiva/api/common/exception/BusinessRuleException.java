package com.gestion_deportiva.api.common.exception;

public abstract class BusinessRuleException extends RuntimeException {

    protected BusinessRuleException(String message) {
        super(message);
    }
}
