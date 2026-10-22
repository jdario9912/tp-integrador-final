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

// El preflight CORS lo resuelve Spring Security antes de la autenticación, para cualquier origen
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class CorsE2ETest {

    @LocalServerPort
    private int port;

    private RestClient client;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
    }

    @Test
    void shouldAcceptPreflightFromAnyOrigin() {
        // Act
        ResponseEntity<Void> response = client.method(HttpMethod.OPTIONS)
                .uri("/api/coaches")
                .header(HttpHeaders.ORIGIN, "http://cualquier-origen.com")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toBodilessEntity();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("*", response.getHeaders().getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
