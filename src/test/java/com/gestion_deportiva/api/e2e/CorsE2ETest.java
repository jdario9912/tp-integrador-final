package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

// El preflight CORS lo resuelve Spring Security antes de la autenticación. Solo se aceptan los orígenes de
// app.cors.allowed-origins (US-04); en los tests es el default de dev: http://localhost:5173
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class CorsE2ETest {

    private static final String FRONT_ORIGIN = "http://localhost:5173";

    @LocalServerPort
    private int port;

    private RestClient client;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
    }

    @Test
    void shouldAcceptPreflightFromTheFrontOrigin() {
        // Act
        ResponseEntity<Void> response = preflight(FRONT_ORIGIN);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(FRONT_ORIGIN, response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void shouldRejectPreflightFromAnyOtherOrigin() {
        // Act
        ResponseEntity<Void> response = preflight("http://otro-origen.com");

        // Assert: sin el header el navegador bloquea la respuesta
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNull(response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    private ResponseEntity<Void> preflight(String origin) {
        return client.method(HttpMethod.OPTIONS)
                .uri("/api/coaches")
                .header(HttpHeaders.ORIGIN, origin)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toBodilessEntity();
    }
}
