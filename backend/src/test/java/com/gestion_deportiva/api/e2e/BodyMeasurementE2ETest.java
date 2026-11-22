package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import com.gestion_deportiva.api.measurement.repository.BodyMeasurementRecordRepository;
import com.gestion_deportiva.api.measurement.repository.BodyMeasurementValueRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.measurement;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.recordRequest;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.valueRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Medidas corporales (US-45): alta, edición que reemplaza las medidas y listado, con los roles, la pertenencia y los
// errores del contrato (docs/contracts/41-us-45.md, sección 17). Las fechas son pasadas y fijas, salvo "hoy" y "mañana"
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class BodyMeasurementE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bea@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final LocalDate JAN_10 = LocalDate.of(2026, 1, 10);
    private static final LocalDate JAN_12 = LocalDate.of(2026, 1, 12);
    private static final LocalDate JAN_14 = LocalDate.of(2026, 1, 14);

    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    private static final String MALFORMED_BODY_MESSAGE = "El cuerpo de la solicitud no es un JSON válido";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";
    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private BodyMeasurementRecordRepository recordRepository;

    @Autowired
    private BodyMeasurementValueRepository valueRepository;

    @Autowired
    private TimeZoneProperties timeZoneProperties;

    private RestClient client;

    private Coach coach;

    // Leo y Mia son atletas de Ana
    private Athlete leo;

    private Athlete mia;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = saveCoach(COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, coach);
        mia = saveAthlete(OTHER_ATHLETE_EMAIL, coach);
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también las medidas
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- POST /api/athletes/{athleteId}/measurements ----------

    @Test
    void shouldReturn201WithTheValuesInCatalogOrderAndPersistThem() {
        // Act
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10, "  Después  ",
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35.25"),
                valueRequest(BodyMeasurementType.WAIST, null, "84.5"),
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "34.8")), ATHLETE_EMAIL);

        // Assert: respuesta (sin Location ni athleteId, contrato 17.3 y 17.5)
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNull(response.getHeaders().getLocation());
        JsonNode body = json(response);
        assertEquals("2026-01-10", body.get("date").asString());
        assertEquals("Después", body.get("comment").asString());
        assertFalse(body.has("athleteId"));
        assertEquals(List.of("WAIST:null:84.50", "ARM:LEFT:34.80", "ARM:RIGHT:35.25"), values(body));
        assertEquals(body.get("createdAt").asString(), body.get("updatedAt").asString());

        // Assert: base de datos
        assertEquals(3, countValues(UUID.fromString(body.get("id").asString())));
    }

    @Test
    void shouldAcceptOnlyOneSideOfABilateralMeasurement() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(List.of("ARM:RIGHT:35.00"), values(json(response)));
    }

    @Test
    void shouldStoreABlankOrMissingCommentAsNull() {
        ResponseEntity<String> blank = post(leo.getId(), recordRequest(JAN_10, "   ",
                valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, blank.getStatusCode());
        assertTrue(json(blank).get("comment").isNull());
    }

    @Test
    void shouldReturn400WithFieldErrorsForABilateralWithoutSideAndAValueOutOfRange() {
        // ARM sin lado y con 150 (el rango es de 5 a 100)
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.ARM, null, "150")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(response).get("message").asString());
        assertEquals(Set.of(
                "values[0].side: Indique el lado de la medida (LEFT o RIGHT)",
                "values[0].value: El valor debe estar entre 5 y 100"), fieldErrors(response));
        assertEquals(0, countAllValues());
    }

    @Test
    void shouldReturn400WhenASideIsSentForAUnilateralMeasurement() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, MeasurementSide.LEFT, "84")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("values[0].side: Esta medida no admite lado"), fieldErrors(response));
    }

    @Test
    void shouldReturn400ForAZeroOrNegativeValue() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "-5")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("values[0].value: El valor debe ser mayor a 0"), fieldErrors(response));
    }

    @Test
    void shouldReturn400ForMoreThanTwoDecimals() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.CHEST, null, "80.555")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("values[0].value: El valor admite hasta 3 enteros y 2 decimales"),
                fieldErrors(response));
    }

    @Test
    void shouldReturn400ForARepeatedTypeAndSide() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "34"),
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "35")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("values: Hay dos medidas del mismo tipo y lado"), fieldErrors(response));
    }

    @Test
    void shouldReturn400ForAnEmptyListOfValues() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("values: Indique al menos una medida"), fieldErrors(response));
    }

    // Un código que no está en el catálogo no se puede leer: 400 sin fieldErrors (contrato 17.4)
    @Test
    void shouldReturn400WithoutFieldErrorsForABodyThatIsNotReadable() {
        List<String> bodies = List.of(
                "{\"date\": \"2026-01-10\", \"values\": [{\"type\": \"CALF\", \"value\": 30}]}",
                "{\"date\": \"2026-01-10\", \"values\": [{\"type\": \"ARM\", \"side\": \"UP\", \"value\": 30}]}",
                "{\"date\": \"10/01/2026\", \"values\": [{\"type\": \"WAIST\", \"value\": 84}]}",
                "{\"date\": \"2026-01-10\", \"values\": [{\"type\": \"WAIST\", \"value\": \"abc\"}]}");

        for (String raw : bodies) {
            ResponseEntity<String> response = post(leo.getId(), raw, ATHLETE_EMAIL);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode(), raw);
            assertEquals(MALFORMED_BODY_MESSAGE, json(response).get("message").asString(), raw);
            assertFalse(json(response).has("fieldErrors"), raw);
        }
        assertEquals(0, countRecords());
    }

    @Test
    void shouldReturn400ForAFutureDate() {
        LocalDate tomorrow = today().plusDays(1);

        ResponseEntity<String> response = post(leo.getId(), recordRequest(tomorrow,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("date: La fecha no puede ser futura"), fieldErrors(response));
    }

    @Test
    void shouldReturn409WhenTheDayAlreadyHasARecord() {
        saveRecord(leo, JAN_10);

        ResponseEntity<String> response = post(leo.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un registro de medidas para el 10/01/2026", json(response).get("message").asString());
        assertEquals(1, countRecords());
    }

    @Test
    void shouldAllowTheSameDayForAnotherAthlete() {
        saveRecord(leo, JAN_10);

        ResponseEntity<String> response = post(mia.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), OTHER_ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    void shouldReturn401WhenRegisteringWithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, path(leo.getId()),
                recordRequest(JAN_10, valueRequest(BodyMeasurementType.WAIST, null, "84")), null, null);

        assertUnauthorized(response);
    }

    // El entrenador recibe 403 por la regla de rol aunque el atleta sea suyo y el body sea inválido
    @Test
    void shouldReturn403WhenACoachRegistersEvenWithAnInvalidBody() {
        ResponseEntity<String> response = post(leo.getId(), recordRequest(null), COACH_EMAIL);

        assertRoleForbidden(response);
        assertEquals(0, countRecords());
    }

    @Test
    void shouldReturn403WhenAnAthleteRegistersForAnotherAthlete() {
        ResponseEntity<String> response = post(mia.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
    }

    // Atleta inexistente: el rol pasa y la pertenencia responde 404 (no 403)
    @Test
    void shouldReturn404WhenRegisteringForAnAthleteThatDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = post(missing, recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertTrue(json(response).get("message").asString().contains(missing.toString()));
    }

    @Test
    void shouldReturn400WhenTheAthleteIdIsNotAUuid() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "/api/athletes/no-es-uuid/measurements",
                recordRequest(JAN_10, valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // ---------- PUT /api/athletes/{athleteId}/measurements/{recordId} ----------

    // La edición reemplaza la lista completa: lo que no viene desaparece y el alta (created_at) no cambia
    @Test
    void shouldReplaceTheValuesAndKeepTheCreationTimestamp() {
        // Arrange
        BodyMeasurementRecord existing = saveRecordWithValue(leo, JAN_10, "Antes", BodyMeasurementType.WAIST, null,
                "84.5");

        // Act
        ResponseEntity<String> response = put(leo.getId(), existing.getId(), recordRequest(JAN_12, "Nuevo",
                valueRequest(BodyMeasurementType.HIP, null, "95")), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("2026-01-12", body.get("date").asString());
        assertEquals("Nuevo", body.get("comment").asString());
        assertEquals(List.of("HIP:null:95.00"), values(body));
        assertEquals(1, countValues(existing.getId()));
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select created_at, updated_at from body_measurement_records where id = ?", existing.getId());
        assertEquals(CREATED_AT, ((Timestamp) row.get("created_at")).toInstant());
        assertTrue(((Timestamp) row.get("updated_at")).toInstant().isAfter(CREATED_AT));
    }

    @Test
    void shouldClearTheCommentThatIsNotSent() {
        BodyMeasurementRecord existing = saveRecordWithValue(leo, JAN_10, "Antes", BodyMeasurementType.WAIST, null,
                "84.5");

        ResponseEntity<String> response = put(leo.getId(), existing.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "84.5")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(json(response).get("comment").isNull());
    }

    @Test
    void shouldReturn409AndKeepTheRecordWhenMovingItToADayTakenByAnotherRecord() {
        saveRecord(leo, JAN_10);
        BodyMeasurementRecord other = saveRecordWithValue(leo, JAN_12, null, BodyMeasurementType.WAIST, null, "84.5");

        ResponseEntity<String> response = put(leo.getId(), other.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "90")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un registro de medidas para el 10/01/2026", json(response).get("message").asString());
        assertEquals(JAN_12, measuredOn(other.getId()));
        assertEquals(1, countValues(other.getId()));
    }

    @Test
    void shouldKeepTheSameDayWithoutAConflict() {
        BodyMeasurementRecord existing = saveRecordWithValue(leo, JAN_10, null, BodyMeasurementType.WAIST, null,
                "84.5");

        ResponseEntity<String> response = put(leo.getId(), existing.getId(), recordRequest(JAN_10,
                valueRequest(BodyMeasurementType.WAIST, null, "85")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    // El registro de otro atleta o uno inexistente responden igual: 404
    @Test
    void shouldReturn404WhenTheRecordBelongsToAnotherAthleteOrDoesNotExist() {
        BodyMeasurementRecord miasRecord = saveRecord(mia, JAN_10);

        ResponseEntity<String> ofOther = put(leo.getId(), miasRecord.getId(),
                recordRequest(JAN_12, valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);
        ResponseEntity<String> missing = put(leo.getId(), UUID.randomUUID(),
                recordRequest(JAN_12, valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, ofOther.getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, missing.getStatusCode());
        assertEquals(JAN_10, measuredOn(miasRecord.getId()));
    }

    @Test
    void shouldReturn403WhenAnAthleteEditsTheMeasurementsOfAnotherAthlete() {
        BodyMeasurementRecord miasRecord = saveRecord(mia, JAN_10);

        ResponseEntity<String> response = put(mia.getId(), miasRecord.getId(), recordRequest(JAN_12,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
    }

    @Test
    void shouldReturn403WhenACoachEditsARecordOfItsAthlete() {
        BodyMeasurementRecord existing = saveRecord(leo, JAN_10);

        ResponseEntity<String> response = put(leo.getId(), existing.getId(), recordRequest(JAN_12,
                valueRequest(BodyMeasurementType.WAIST, null, "84")), COACH_EMAIL);

        assertRoleForbidden(response);
    }

    @Test
    void shouldReturn400AndKeepTheRecordWhenTheUpdateIsInvalid() {
        BodyMeasurementRecord existing = saveRecordWithValue(leo, JAN_10, null, BodyMeasurementType.WAIST, null,
                "84.5");

        // 5 cm de cintura: por debajo del rango (20 a 300)
        ResponseEntity<String> response = put(leo.getId(), existing.getId(), recordRequest(JAN_12,
                valueRequest(BodyMeasurementType.WAIST, null, "5")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("values[0].value: El valor debe estar entre 20 y 300"), fieldErrors(response));
        assertEquals(JAN_10, measuredOn(existing.getId()));
        assertEquals(1, countValues(existing.getId()));
    }

    @Test
    void shouldReturn401WhenCorrectingWithoutToken() {
        BodyMeasurementRecord existing = saveRecord(leo, JAN_10);

        ResponseEntity<String> response = exchange(HttpMethod.PUT, path(leo.getId()) + "/" + existing.getId(),
                recordRequest(JAN_12, valueRequest(BodyMeasurementType.WAIST, null, "84")), null, null);

        assertUnauthorized(response);
    }

    // ---------- GET /api/athletes/{athleteId}/measurements ----------

    @Test
    void shouldListTheAthletesOwnRecordsFromTheNewestWithTheirValues() {
        saveRecordWithValue(leo, JAN_10, null, BodyMeasurementType.WAIST, null, "84.5");
        saveRecordWithValue(leo, JAN_12, null, BodyMeasurementType.HIP, null, "95");

        ResponseEntity<String> response = list(leo.getId(), "", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode page = json(response);
        assertEquals(List.of("2026-01-12", "2026-01-10"), dates(page));
        assertEquals(List.of("HIP:null:95.00"), values(page.get("content").get(0)));
        assertEquals(2, page.get("totalElements").asInt());
    }

    @Test
    void shouldLetTheCoachSeeTheRecordsOfItsAthlete() {
        saveRecord(leo, JAN_10);

        ResponseEntity<String> response = list(leo.getId(), "", COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of("2026-01-10"), dates(json(response)));
    }

    @Test
    void shouldFilterByAnInclusiveRange() {
        saveRecord(leo, JAN_10);
        saveRecord(leo, JAN_12);
        saveRecord(leo, JAN_14);

        ResponseEntity<String> response = list(leo.getId(), "?from=2026-01-10&to=2026-01-12", ATHLETE_EMAIL);

        assertEquals(List.of("2026-01-12", "2026-01-10"), dates(json(response)));
    }

    @Test
    void shouldReturnAnEmptyPageWhenTheAthleteHasNoRecords() {
        ResponseEntity<String> response = list(leo.getId(), "", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(), dates(json(response)));
        assertEquals(0, json(response).get("totalElements").asInt());
    }

    @Test
    void shouldReturn400OnTheFromFieldWhenFromIsAfterTo() {
        ResponseEntity<String> response = list(leo.getId(), "?from=2026-01-14&to=2026-01-10", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("from: La fecha desde no puede ser posterior a la fecha hasta"), fieldErrors(response));
    }

    @Test
    void shouldReturn403WhenTheCoachListsAnAthleteOfAnotherCoach() {
        saveCoach(OTHER_COACH_EMAIL);

        ResponseEntity<String> response = list(leo.getId(), "", OTHER_COACH_EMAIL);

        assertAthleteForbidden(response, leo);
    }

    @Test
    void shouldReturn403WhenAnAthleteListsAnotherAthlete() {
        ResponseEntity<String> response = list(mia.getId(), "", ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
    }

    @Test
    void shouldReturn401WhenListingWithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, path(leo.getId()), null, null, null);

        assertUnauthorized(response);
    }

    // ---------- GET /api/body-measurement-types ----------

    @Test
    void shouldListTheCatalogForBothRoles() {
        for (String email : List.of(ATHLETE_EMAIL, COACH_EMAIL)) {
            ResponseEntity<String> response = exchange(HttpMethod.GET, "/api/body-measurement-types", null, email,
                    null);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            JsonNode catalog = json(response);
            assertEquals(6, catalog.size());
            assertEquals("WAIST", catalog.get(0).get("code").asString());
            assertEquals("cm", catalog.get(0).get("unit").asString());
            assertFalse(catalog.get(0).get("bilateral").asBoolean());
            assertEquals(20, catalog.get(0).get("min").asInt());
            assertEquals(300, catalog.get(0).get("max").asInt());
            assertTrue(catalog.get(3).get("bilateral").asBoolean());
            assertEquals("BODY_FAT", catalog.get(5).get("code").asString());
        }
    }

    @Test
    void shouldReturn401ForTheCatalogWithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, "/api/body-measurement-types", null, null, null);

        assertUnauthorized(response);
    }

    // ---------- ayudas ----------

    private ResponseEntity<String> post(UUID athleteId, Object body, String email) {
        return exchange(HttpMethod.POST, path(athleteId), body, email, null);
    }

    private ResponseEntity<String> put(UUID athleteId, UUID recordId, Object body, String email) {
        return exchange(HttpMethod.PUT, path(athleteId) + "/" + recordId, body, email, null);
    }

    private ResponseEntity<String> list(UUID athleteId, String query, String email) {
        return exchange(HttpMethod.GET, path(athleteId) + query, null, email, null);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/measurements";
    }

    // Request con la sesión de ese email, o sin credenciales (ambos null). Un body String se manda tal cual (JSON roto
    // o vacío); cualquier otro se serializa
    private ResponseEntity<String> exchange(HttpMethod method, String uri, Object body, String email, String token) {
        RestClient.RequestBodySpec request = client.method(method)
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    } else if (token != null) {
                        headers.setBearerAuth(token);
                    }
                });
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON)
                    .body(body instanceof String raw ? raw : jsonMapper.writeValueAsString(body));
        }
        return request.retrieve()
                // Los 4xx se validan en cada test, no deben lanzar excepción
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    // "campo: mensaje" de cada error de fieldErrors
    private Set<String> fieldErrors(ResponseEntity<String> response) {
        Set<String> errors = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> errors.add(
                error.get("field").asString() + ": " + error.get("message").asString()));
        return errors;
    }

    // Cada medida como "TIPO:LADO:VALOR" (LADO null cuando no es bilateral), en el orden de la respuesta
    private static List<String> values(JsonNode record) {
        List<String> values = new ArrayList<>();
        record.get("values").forEach(value -> values.add(value.get("type").asString() + ":"
                + (value.get("side").isNull() ? "null" : value.get("side").asString()) + ":"
                + value.get("value").decimalValue().setScale(2).toPlainString()));
        return values;
    }

    private static List<String> dates(JsonNode page) {
        List<String> dates = new ArrayList<>();
        page.get("content").forEach(record -> dates.add(record.get("date").asString()));
        return dates;
    }

    private void assertUnauthorized(ResponseEntity<String> response) {
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    // 403 de la regla de rol (SecurityConfig)
    private void assertRoleForbidden(ResponseEntity<String> response) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
    }

    // 403 de pertenencia (AthleteAccessGuard)
    private void assertAthleteForbidden(ResponseEntity<String> response, Athlete requested) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertTrue(body.get("path").asString().startsWith(path(requested.getId())));
    }

    // "Hoy" como lo calcula el backend (zona de la app)
    private LocalDate today() {
        return LocalDate.now(timeZoneProperties.zoneId());
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }

    // Registro sin medidas
    private BodyMeasurementRecord saveRecord(Athlete athlete, LocalDate date) {
        return recordRepository.saveAndFlush(record(athlete, date));
    }

    // Registro con una medida, guardado con su fila. Se guarda primero el registro (la medida lo necesita con id)
    private BodyMeasurementRecord saveRecordWithValue(Athlete athlete, LocalDate date, String comment,
                                                      BodyMeasurementType type, MeasurementSide side, String value) {
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(record(athlete, date, comment));
        valueRepository.saveAndFlush(measurement(saved, type, side, value));
        return saved;
    }

    private LocalDate measuredOn(UUID recordId) {
        return jdbcTemplate.queryForObject("select measured_on from body_measurement_records where id = ?",
                Date.class, recordId).toLocalDate();
    }

    private int countRecords() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from body_measurement_records", Integer.class);
        return count == null ? 0 : count;
    }

    private int countAllValues() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from body_measurement_values", Integer.class);
        return count == null ? 0 : count;
    }

    private int countValues(UUID recordId) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from body_measurement_values where record_id = ?",
                Integer.class, recordId);
        return count == null ? 0 : count;
    }
}
