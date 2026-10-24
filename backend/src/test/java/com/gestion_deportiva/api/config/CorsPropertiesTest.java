package com.gestion_deportiva.api.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Un origen mal escrito haría que el navegador bloquee al front sin un error claro: se rechaza al arrancar
class CorsPropertiesTest {

    @Test
    void shouldAcceptOriginsWithSchemeHostAndPortAndTrimThem() {
        // Act
        CorsProperties properties = new CorsProperties(
                List.of("http://localhost:5173", " https://app.ejemplo.com ", "https://app.ejemplo.com:8443"));

        // Assert
        assertEquals(List.of("http://localhost:5173", "https://app.ejemplo.com", "https://app.ejemplo.com:8443"),
                properties.allowedOrigins());
    }

    @ParameterizedTest
    @ValueSource(strings = {"*", "https://*.ejemplo.com", "https://app.ejemplo.com/", "https://app.ejemplo.com/front",
            "app.ejemplo.com", "ftp://app.ejemplo.com", ""})
    void shouldRejectInvalidOrigins(String origin) {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new CorsProperties(List.of("http://localhost:5173", origin)));

        assertTrue(ex.getMessage().contains("CORS_ALLOWED_ORIGINS"));
    }
}
