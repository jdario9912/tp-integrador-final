package com.gestion_deportiva.api.common.upload.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ImageTooLargeExceptionTest {

    private static final long MB = 1024L * 1024L;

    @Test
    void shouldNameAWholeLimitInMegabytes() {
        assertEquals("La foto supera el tamaño máximo permitido de 5 MB", ImageTooLargeException.messageFor(5 * MB));
    }

    @Test
    void shouldShowAFractionalLimitWithOneDecimal() {
        assertEquals("La foto supera el tamaño máximo permitido de 2.5 MB",
                ImageTooLargeException.messageFor(MB * 5 / 2));
    }
}
