package com.gestion_deportiva.api.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class EmailAlreadyRegisteredExceptionTest {

    @Test
    void keepsTheEmailAndAReadableMessage() {
        EmailAlreadyRegisteredException ex = new EmailAlreadyRegisteredException("ana@test.com");

        assertEquals("ana@test.com", ex.getEmail());
        assertEquals("Ya existe un usuario registrado con el email ana@test.com", ex.getMessage());
    }

    @Test
    void keepsTheOriginalCause() {
        RuntimeException cause = new RuntimeException("duplicate key");
        EmailAlreadyRegisteredException ex = new EmailAlreadyRegisteredException("ana@test.com", cause);

        assertSame(cause, ex.getCause());
        assertEquals("ana@test.com", ex.getEmail());
    }
}
