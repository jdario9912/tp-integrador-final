package com.gestion_deportiva.api.support;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import java.util.Map;

// Único punto donde los e2e arman la autenticación de una request: login y "Bearer <accessToken>".
// Si el login falla (credenciales inválidas, cuenta desactivada) no se manda token y el endpoint responde 401
public final class AuthHeaders {

    private static final String LOGIN_PATH = "/api/auth/login";

    private AuthHeaders() {
    }

    public static void authenticate(HttpHeaders headers, RestClient client, String email, String password) {
        ResponseEntity<Map> response = client.post()
                .uri(LOGIN_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", email, "password", password))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(Map.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            headers.setBearerAuth((String) response.getBody().get("accessToken"));
        }
    }
}
