package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// La spec de springdoc queda fuera del prefijo /api y pública, y documenta los endpoints con el prefijo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class OpenApiE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private JsonMapper jsonMapper;

    private RestClient client;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
    }

    @Test
    void shouldServeApiDocsWithoutAuthenticationAndWithPrefixedPaths() {
        // Act
        ResponseEntity<String> response = get("/v3/api-docs");

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode paths = jsonMapper.readTree(response.getBody()).get("paths");
        assertTrue(paths.has("/api/coaches"));
        assertFalse(paths.has("/coaches"));
        assertTrue(paths.get("/api/coaches").get("post").get("responses").has("201"));
    }

    @Test
    void shouldServeSwaggerUiConfigOutsideTheApiPrefix() {
        assertEquals(HttpStatus.OK, get("/v3/api-docs/swagger-config").getStatusCode());
    }

    private ResponseEntity<String> get(String path) {
        return client.get()
                .uri(path)
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }
}
