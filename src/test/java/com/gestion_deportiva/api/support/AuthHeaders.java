package com.gestion_deportiva.api.support;

import org.springframework.http.HttpHeaders;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

// Único punto donde los e2e arman la autenticación de una request.
// Al migrar a JWT se cambia solo este helper (login + "Bearer <token>"), no los tests (ver docs/AUTH.md)
public final class AuthHeaders {

    private AuthHeaders() {
    }

    private static String basic(String email, String password) {
        String credentials = email + ":" + password;
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    public static void authenticate(HttpHeaders headers, String email, String password) {
        headers.set(HttpHeaders.AUTHORIZATION, basic(email, password));
    }
}
