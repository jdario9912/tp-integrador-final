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

    // US-23: las cuatro rutas de comidas, con su código de éxito y el parámetro ?date del listado
    @Test
    void shouldDocumentTheMealEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        assertTrue(paths.get("/api/athletes/{athleteId}/meals").get("post").get("responses").has("201"));
        assertTrue(paths.get("/api/athletes/{athleteId}/meals").get("get").get("parameters").toString()
                .contains("\"date\""));
        assertTrue(paths.get("/api/athletes/{athleteId}/meals/{mealId}").has("put"));
        assertTrue(paths.get("/api/athletes/{athleteId}/meals/{mealId}").get("delete").get("responses")
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

    // US-20 · finalizar y cancelar: los dos POST sin body documentan su 200 y su 409 (@ApiResponses del controller)
    @Test
    void shouldDocumentTheFinishAndCancelEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        for (String action : new String[] {"finish", "cancel"}) {
            JsonNode responses = paths.get("/api/athletes/{athleteId}/sessions/{sessionId}/" + action)
                    .get("post").get("responses");
            assertTrue(responses.has("200"), action);
            assertTrue(responses.has("409"), action);
        }
    }

    // US-21 · el historial documenta sus filtros y su paginación como query params; la revisión documenta sus errores
    // y el 422 (@ApiResponses del controller)
    @Test
    void shouldDocumentTheTrainingSessionHistoryAndReviewEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert: el listado con sus query params y el 200
        JsonNode history = paths.get("/api/athletes/{athleteId}/sessions").get("get");
        assertTrue(history.get("parameters").toString().contains("\"from\""));
        assertTrue(history.get("parameters").toString().contains("\"to\""));
        assertTrue(history.get("parameters").toString().contains("\"page\""));
        assertTrue(history.get("responses").has("200"));

        // Assert: la revisión documenta su 200, el 400 del body, el 403 y el 404, y el 422 de estado
        JsonNode review = paths.get("/api/athletes/{athleteId}/sessions/{sessionId}/review").get("put").get("responses");
        for (String status : new String[] {"200", "400", "403", "404", "422"}) {
            assertTrue(review.has(status), status);
        }
    }

    // US-24: el resumen documenta su 200 y el ?date como query param (el mismo filtro que el listado de comidas)
    @Test
    void shouldDocumentTheMealSummaryEndpoint() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        JsonNode summary = paths.get("/api/athletes/{athleteId}/meals/summary").get("get");
        assertTrue(summary.get("parameters").toString().contains("\"date\""));
        assertTrue(summary.get("responses").has("200"));
    }

    // US-25: la vista por rango documenta ?from y ?to como query params; la revisión documenta sus errores
    @Test
    void shouldDocumentTheMealOverviewAndReviewEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        JsonNode overview = paths.get("/api/athletes/{athleteId}/meals/overview").get("get");
        assertTrue(overview.get("parameters").toString().contains("\"from\""));
        assertTrue(overview.get("parameters").toString().contains("\"to\""));
        assertTrue(overview.get("responses").has("200"));
        JsonNode review = paths.get("/api/athletes/{athleteId}/meals/{mealId}/review").get("put").get("responses");
        for (String status : new String[] {"200", "400", "403", "404"}) {
            assertTrue(review.has(status), status);
        }
    }

    // US-45 (bloque propio): el alta devuelve 201, la edición documenta sus errores, el listado tiene ?from y ?to, y el
    // catálogo de medidas aparece con su respuesta 200
    @Test
    void shouldDocumentTheBodyMeasurementEndpoints() {
        // Act
        JsonNode paths = jsonMapper.readTree(get("/v3/api-docs").getBody()).get("paths");

        // Assert
        JsonNode measurements = paths.get("/api/athletes/{athleteId}/measurements");
        assertTrue(measurements.get("post").get("responses").has("201"));
        assertTrue(measurements.get("get").get("parameters").toString().contains("\"from\""));
        assertTrue(measurements.get("get").get("parameters").toString().contains("\"to\""));
        JsonNode update = paths.get("/api/athletes/{athleteId}/measurements/{recordId}").get("put").get("responses");
        for (String status : new String[] {"200", "400", "403", "404", "409"}) {
            assertTrue(update.has(status), status);
        }
        assertTrue(paths.get("/api/body-measurement-types").get("get").get("responses").has("200"));
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
