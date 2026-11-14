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
    void shouldDocumentTheWeightRecordEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert: el alta documenta el 201 (@ResponseStatus) y el listado, los filtros como query params
        JsonNode weights = paths.get("/api/athletes/{athleteId}/weights");
        assertTrue(weights.get("post").get("responses").has("201"));
        assertTrue(weights.get("get").get("parameters").toString().contains("\"from\""));
        assertTrue(weights.get("get").get("parameters").toString().contains("\"to\""));
        assertTrue(paths.get("/api/athletes/{athleteId}/weights/{weightId}").has("put"));
    }

    @Test
    void shouldDocumentTheAthleteRoutineEndpointWithItsNoContentResponse() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert: 200 con la rutina y 204 sin rutina activa (@ApiResponses del controller)
        JsonNode responses = paths.get("/api/athletes/{athleteId}/routine").get("get").get("responses");
        assertTrue(responses.has("200"));
        assertTrue(responses.has("204"));
    }

    @Test
    void shouldDocumentTheTrainingSessionEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert: el alta documenta el 201 (@ResponseStatus); la sesión en progreso, el 200 y el 204 (@ApiResponses)
        assertTrue(paths.get("/api/athletes/{athleteId}/sessions").get("post").get("responses").has("201"));
        JsonNode inProgress = paths.get("/api/athletes/{athleteId}/sessions/in-progress").get("get").get("responses");
        assertTrue(inProgress.has("200"));
        assertTrue(inProgress.has("204"));
        assertTrue(paths.get("/api/athletes/{athleteId}/sessions/{sessionId}").has("get"));
    }

    // US-28 (bloque propio): la subida es multipart, el 201 del alta sale en la documentación y el borrado responde 204
    @Test
    void shouldDocumentThePhotoEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        JsonNode photos = paths.get("/api/athletes/{athleteId}/photos");
        // Las tres partes del formulario, no query params: así Swagger UI puede subir la foto
        JsonNode multipart = photos.get("post").get("requestBody").get("content").get("multipart/form-data");
        assertTrue(multipart.get("schema").get("properties").has("file"));
        assertTrue(multipart.get("schema").get("properties").has("type"));
        assertTrue(multipart.get("schema").get("properties").has("takenOn"));
        assertFalse(photos.get("post").get("parameters").toString().contains("\"name\":\"type\""));
        assertTrue(photos.get("post").get("responses").has("201"));
        assertTrue(photos.get("get").get("parameters").toString().contains("\"page\""));
        assertTrue(paths.get("/api/athletes/{athleteId}/photos/{photoId}").has("get"));
        assertTrue(paths.get("/api/athletes/{athleteId}/photos/{photoId}").get("delete").get("responses")
                .has("204"));
    }

    @Test
    void shouldServeSwaggerUiConfigOutsideTheApiPrefix() {
        assertEquals(HttpStatus.OK, get("/v3/api-docs/swagger-config").getStatusCode());
    }

    // US-19 · series registradas en vivo: el PUT de la serie documenta su 200 y sus errores de validación (400)
    @Test
    void shouldDocumentThePerformedSetEndpoint() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        JsonNode put = paths
                .get("/api/athletes/{athleteId}/sessions/{sessionId}/exercises/{routineExerciseId}/sets/{setNumber}")
                .get("put");
        assertTrue(put.get("responses").has("200"));
        assertTrue(put.get("responses").has("400"));
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
