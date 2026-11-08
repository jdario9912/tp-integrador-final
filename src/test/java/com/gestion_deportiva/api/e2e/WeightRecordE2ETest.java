package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.weight.model.WeightRecord;
import com.gestion_deportiva.api.weight.repository.WeightRecordRepository;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecord;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecordRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Registros de peso (US-26): alta, corrección y listado, con los roles, la pertenencia y los errores del contrato
// (docs/api-contract.md, sección 8). Las fechas son pasadas y fijas, salvo las que prueban "hoy" y "mañana", que se
// calculan en la zona de la app
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class WeightRecordE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
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
    private WeightRecordRepository weightRecordRepository;

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

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también athletes y
    // weight_records
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- POST /api/athletes/{athleteId}/weights ----------

    @Test
    void shouldReturn201WithTheRecordAndPersistIt() {
        // Act
        ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(JAN_10, "72.5", "  En ayunas  "),
                ATHLETE_EMAIL);

        // Assert: respuesta (sin Location ni athleteId, contrato 8.2 y 8.4)
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNull(response.getHeaders().getLocation());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertEquals("2026-01-10", body.get("date").asString());
        assertEquals(0, new BigDecimal("72.5").compareTo(body.get("weightKg").decimalValue()));
        assertEquals("En ayunas", body.get("comment").asString());
        assertTrue(body.hasNonNull("createdAt"));
        assertEquals(body.get("createdAt").asString(), body.get("updatedAt").asString());
        assertFalse(body.has("athleteId"));

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap("select athlete_id::text as athlete_id, recorded_on,"
                + " weight_kg, comment from weight_records where id = ?::uuid", id);
        assertEquals(leo.getId().toString(), row.get("athlete_id"));
        assertEquals(JAN_10, ((java.sql.Date) row.get("recorded_on")).toLocalDate());
        assertEquals(new BigDecimal("72.50"), row.get("weight_kg"));
        assertEquals("En ayunas", row.get("comment"));
    }

    @Test
    void shouldStoreABlankOrMissingCommentAsNull() {
        ResponseEntity<String> blank = post(leo.getId(), weightRecordRequest(JAN_10, "72.5", "   "), ATHLETE_EMAIL);
        ResponseEntity<String> missing = post(leo.getId(), "{\"date\": \"2026-01-12\", \"weightKg\": 72.5}",
                ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, blank.getStatusCode());
        assertTrue(json(blank).get("comment").isNull());
        assertEquals(HttpStatus.CREATED, missing.getStatusCode());
        assertTrue(json(missing).get("comment").isNull());
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from weight_records where comment is not null",
                Integer.class));
    }

    @Test
    void shouldIgnoreAnAthleteIdOrIdSentInTheBody() {
        // Arrange: el atleta sale de la ruta y del token
        String body = "{\"date\": \"2026-01-10\", \"weightKg\": 72.5, \"athleteId\": \"" + mia.getId()
                + "\", \"id\": \"" + UUID.randomUUID() + "\"}";

        // Act
        ResponseEntity<String> response = post(leo.getId(), body, ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(1, countFor(leo));
        assertEquals(0, countFor(mia));
    }

    @Test
    void shouldAcceptTheLimitsOfTheWeightRange() {
        assertEquals(HttpStatus.CREATED,
                post(leo.getId(), weightRecordRequest(JAN_10, "20", null), ATHLETE_EMAIL).getStatusCode());
        assertEquals(HttpStatus.CREATED,
                post(leo.getId(), weightRecordRequest(JAN_12, "300", null), ATHLETE_EMAIL).getStatusCode());
    }

    @Test
    void shouldAcceptTodayInTheAppTimeZone() {
        ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(today()), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(today().toString(), json(response).get("date").asString());
    }

    @Test
    void shouldReturn400WhenTheDateIsInTheFuture() {
        // Act
        ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(today().plusDays(1)), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        assertEquals(1, body.get("fieldErrors").size());
        assertEquals("date", body.get("fieldErrors").get(0).get("field").asString());
        assertEquals("La fecha no puede ser futura", body.get("fieldErrors").get(0).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WithTheInvalidFields() {
        // Act: sin fecha, peso fuera de rango y comentario de 501 caracteres
        ResponseEntity<String> response = post(leo.getId(),
                Map.of("weightKg", new BigDecimal("19.99"), "comment", "c".repeat(501)), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(response).get("message").asString());
        assertEquals(Set.of("date", "weightKg", "comment"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenTheWeightIsOutOfRangeOrHasMoreThanTwoDecimals() {
        for (String weightKg : List.of("300.01", "72.555")) {
            ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(JAN_10, weightKg, null),
                    ATHLETE_EMAIL);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode(), weightKg);
            assertEquals(Set.of("weightKg"), fieldErrors(response), weightKg);
        }
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WithoutFieldErrorsForAMalformedBody() {
        // Body vacío o roto, peso no numérico, fecha con otro formato o inexistente
        List<String> bodies = List.of(
                "",
                "{\"date\": \"2026-01-10\", ",
                "{\"date\": \"2026-01-10\", \"weightKg\": \"abc\"}",
                "{\"date\": \"10/01/2026\", \"weightKg\": 72.5}",
                "{\"date\": \"2026-02-30\", \"weightKg\": 72.5}");

        for (String raw : bodies) {
            ResponseEntity<String> response = post(leo.getId(), raw, ATHLETE_EMAIL);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode(), raw);
            JsonNode body = json(response);
            assertEquals(MALFORMED_BODY_MESSAGE, body.get("message").asString(), raw);
            assertFalse(body.has("fieldErrors"), raw);
        }
        assertEquals(0, count());
    }

    @Test
    void shouldReturn409WhenTheDayAlreadyHasARecord() {
        // Arrange
        saveRecord(leo, JAN_10, "73");

        // Act
        ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(JAN_10), ATHLETE_EMAIL);

        // Assert: no se crea ni se modifica nada
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(409, body.get("status").asInt());
        assertEquals("Ya existe un registro de peso para el 10/01/2026", body.get("message").asString());
        assertEquals(1, count());
        assertEquals(new BigDecimal("73.00"), jdbcTemplate.queryForObject(
                "select weight_kg from weight_records", BigDecimal.class));
    }

    @Test
    void shouldAllowTheSameDayForAnotherAthlete() {
        saveRecord(mia, JAN_10, "60");

        ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(JAN_10), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(2, count());
    }

    @Test
    void shouldReturn401WhenRegisteringWithoutToken() {
        ResponseEntity<String> response = post(leo.getId(), weightRecordRequest(JAN_10), null);

        assertUnauthorized(response);
        assertEquals(0, count());
    }

    @Test
    void shouldReturn403WhenACoachRegistersAWeightEvenForItsOwnAthleteAndWithAnInvalidBody() {
        // La regla de rol corre antes de leer el body
        assertRoleForbidden(post(leo.getId(), weightRecordRequest(JAN_10), COACH_EMAIL));
        assertRoleForbidden(post(leo.getId(), "{}", COACH_EMAIL));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn403WhenAnAthleteRegistersAWeightForAnotherAthlete() {
        ResponseEntity<String> response = post(mia.getId(), weightRecordRequest(JAN_10), ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
        assertEquals(0, count());
    }

    @Test
    void shouldReturn404WhenRegisteringForAnAthleteThatDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = post(missing, weightRecordRequest(JAN_10), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenTheAthleteIdIsNotAUuid() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "/api/athletes/no-es-un-uuid/weights",
                weightRecordRequest(JAN_10), ATHLETE_EMAIL, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldLetAnUnlinkedAthleteRegisterAndListItsWeightsButNotItsFormerCoach() {
        // Arrange: atleta desvinculado (sin entrenador, US-07)
        Athlete ema = saveAthlete("ema@test.com", null);

        // Act + Assert
        assertEquals(HttpStatus.CREATED,
                post(ema.getId(), weightRecordRequest(JAN_10), "ema@test.com").getStatusCode());
        assertEquals(List.of("2026-01-10"), dates(json(list(ema.getId(), "", "ema@test.com"))));
        assertAthleteForbidden(list(ema.getId(), "", COACH_EMAIL), ema);
    }

    @Test
    void shouldReturn404ToADeletedAthleteWithItsStillValidToken() {
        // Arrange: el access token sigue vigente después de la baja lógica (máximo 15 min, contrato 1.2)
        String token = accessToken(ATHLETE_EMAIL);
        jdbcTemplate.update("update users set deleted_at = now() where id = ?", leo.getId());
        String path = path(leo.getId());

        // Act + Assert
        assertEquals(HttpStatus.NOT_FOUND,
                exchange(HttpMethod.POST, path, weightRecordRequest(JAN_10), null, token).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, exchange(HttpMethod.GET, path, null, null, token).getStatusCode());
        assertEquals(0, count());
    }

    // ---------- PUT /api/athletes/{athleteId}/weights/{weightId} ----------

    @Test
    void shouldReturn200AndCorrectTheRecord() {
        // Arrange
        WeightRecord existing = saveRecord(leo, JAN_10, "73.1", "Antes");

        // Act
        ResponseEntity<String> response = put(leo.getId(), existing.getId(),
                weightRecordRequest(JAN_12, "72.5", " Después "), ATHLETE_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(existing.getId().toString(), body.get("id").asString());
        assertEquals("2026-01-12", body.get("date").asString());
        assertEquals(0, new BigDecimal("72.5").compareTo(body.get("weightKg").decimalValue()));
        assertEquals("Después", body.get("comment").asString());
        assertEquals(CREATED_AT, Instant.parse(body.get("createdAt").asString()));
        assertTrue(Instant.parse(body.get("updatedAt").asString()).isAfter(CREATED_AT));

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select recorded_on, weight_kg, comment from weight_records where id = ?", existing.getId());
        assertEquals(JAN_12, ((java.sql.Date) row.get("recorded_on")).toLocalDate());
        assertEquals(new BigDecimal("72.50"), row.get("weight_kg"));
        assertEquals("Después", row.get("comment"));
        assertEquals(1, count());
    }

    @Test
    void shouldKeepTheSameDateAndClearTheCommentNotSent() {
        // Arrange
        WeightRecord existing = saveRecord(leo, JAN_10, "73.1", "Antes");

        // Act: misma fecha (no es un conflicto) y sin comentario (edición completa)
        ResponseEntity<String> response = put(leo.getId(), existing.getId(),
                "{\"date\": \"2026-01-10\", \"weightKg\": 72.5}", ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("2026-01-10", json(response).get("date").asString());
        assertTrue(json(response).get("comment").isNull());
        assertNull(jdbcTemplate.queryForObject("select comment from weight_records where id = ?", String.class,
                existing.getId()));
    }

    @Test
    void shouldReturn409AndKeepTheRecordWhenMovingItToADayTakenByAnotherRecord() {
        // Arrange
        saveRecord(leo, JAN_10, "73");
        WeightRecord other = saveRecord(leo, JAN_12, "72");

        // Act
        ResponseEntity<String> response = put(leo.getId(), other.getId(), weightRecordRequest(JAN_10),
                ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un registro de peso para el 10/01/2026", json(response).get("message").asString());
        assertRecordUnchanged(other, JAN_12, "72.00");
    }

    @Test
    void shouldReturn404WhenTheRecordBelongsToAnotherAthleteOrDoesNotExist() {
        // Arrange
        WeightRecord miasRecord = saveRecord(mia, JAN_10, "60");
        UUID missing = UUID.randomUUID();

        // Act
        ResponseEntity<String> foreign = put(leo.getId(), miasRecord.getId(), weightRecordRequest(JAN_12),
                ATHLETE_EMAIL);
        ResponseEntity<String> unknown = put(leo.getId(), missing, weightRecordRequest(JAN_12), ATHLETE_EMAIL);

        // Assert: la misma respuesta en los dos casos
        assertEquals(HttpStatus.NOT_FOUND, foreign.getStatusCode());
        assertEquals("No existe el registro de peso con id " + miasRecord.getId(),
                json(foreign).get("message").asString());
        assertEquals(HttpStatus.NOT_FOUND, unknown.getStatusCode());
        assertEquals("No existe el registro de peso con id " + missing, json(unknown).get("message").asString());
        assertRecordUnchanged(miasRecord, JAN_10, "60.00");
    }

    @Test
    void shouldReturn403WhenAnAthleteEditsTheRecordsOfAnotherAthlete() {
        // Arrange
        WeightRecord miasRecord = saveRecord(mia, JAN_10, "60");

        // Act + Assert: la pertenencia va antes que la existencia del registro (no revela si el id existe)
        assertAthleteForbidden(put(mia.getId(), miasRecord.getId(), weightRecordRequest(JAN_12), ATHLETE_EMAIL),
                mia);
        assertAthleteForbidden(put(mia.getId(), UUID.randomUUID(), weightRecordRequest(JAN_12), ATHLETE_EMAIL),
                mia);
        assertRecordUnchanged(miasRecord, JAN_10, "60.00");
    }

    @Test
    void shouldReturn403WhenACoachEditsARecordOfItsAthlete() {
        WeightRecord existing = saveRecord(leo, JAN_10, "73");

        assertRoleForbidden(put(leo.getId(), existing.getId(), weightRecordRequest(JAN_12), COACH_EMAIL));
        assertRecordUnchanged(existing, JAN_10, "73.00");
    }

    @Test
    void shouldReturn400AndKeepTheRecordWhenTheUpdateIsInvalid() {
        // Arrange
        WeightRecord existing = saveRecord(leo, JAN_10, "73");

        // Act
        ResponseEntity<String> future = put(leo.getId(), existing.getId(), weightRecordRequest(today().plusDays(1)),
                ATHLETE_EMAIL);
        ResponseEntity<String> invalid = put(leo.getId(), existing.getId(),
                weightRecordRequest(JAN_12, "301", "c".repeat(501)), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, future.getStatusCode());
        assertEquals(Set.of("date"), fieldErrors(future));
        assertEquals(HttpStatus.BAD_REQUEST, invalid.getStatusCode());
        assertEquals(Set.of("weightKg", "comment"), fieldErrors(invalid));
        assertRecordUnchanged(existing, JAN_10, "73.00");
    }

    @Test
    void shouldReturn401WhenCorrectingWithoutToken() {
        WeightRecord existing = saveRecord(leo, JAN_10, "73");

        assertUnauthorized(put(leo.getId(), existing.getId(), weightRecordRequest(JAN_12), null));
        assertRecordUnchanged(existing, JAN_10, "73.00");
    }

    @Test
    void shouldReturn400WhenTheWeightIdIsNotAUuid() {
        ResponseEntity<String> response = exchange(HttpMethod.PUT, path(leo.getId()) + "/no-es-un-uuid",
                weightRecordRequest(JAN_10), ATHLETE_EMAIL, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // ---------- GET /api/athletes/{athleteId}/weights ----------

    @Test
    void shouldListTheAthletesOwnRecordsFromTheNewest() {
        // Arrange: guardados desordenados y uno de otra atleta
        saveRecord(leo, JAN_10, "74");
        saveRecord(leo, JAN_14, "72.5", "En ayunas");
        saveRecord(leo, JAN_12, "73");
        saveRecord(mia, JAN_12.plusDays(1), "60");

        // Act
        ResponseEntity<String> response = list(leo.getId(), "", ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode page = json(response);
        assertEquals(List.of("2026-01-14", "2026-01-12", "2026-01-10"), dates(page));
        assertEquals(3, page.get("totalElements").asInt());
        assertEquals(1, page.get("totalPages").asInt());
        assertEquals(0, page.get("page").asInt());
        assertEquals(20, page.get("size").asInt());
        JsonNode newest = page.get("content").get(0);
        assertTrue(newest.hasNonNull("id"));
        assertEquals(0, new BigDecimal("72.5").compareTo(newest.get("weightKg").decimalValue()));
        assertEquals("En ayunas", newest.get("comment").asString());
        assertTrue(page.get("content").get(1).get("comment").isNull());
        assertTrue(newest.hasNonNull("createdAt"));
        assertTrue(newest.hasNonNull("updatedAt"));
    }

    @Test
    void shouldLetTheCoachSeeTheLatestWeightOfItsAthleteEvenIfDeactivated() {
        // Arrange: CA-4 (ficha del entrenador), también con la cuenta del atleta desactivada
        saveRecord(leo, JAN_10, "74");
        saveRecord(leo, JAN_14, "72.5");
        jdbcTemplate.update("update users set active = false where id = ?", leo.getId());

        // Act
        ResponseEntity<String> response = list(leo.getId(), "?size=1", COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode page = json(response);
        assertEquals(List.of("2026-01-14"), dates(page));
        assertEquals(1, page.get("size").asInt());
        assertEquals(2, page.get("totalElements").asInt());
    }

    @Test
    void shouldReturnAnEmptyPageWhenTheAthleteHasNoRecords() {
        saveRecord(mia, JAN_10, "60");

        JsonNode page = json(list(leo.getId(), "", COACH_EMAIL));

        assertTrue(dates(page).isEmpty());
        assertEquals(0, page.get("totalElements").asInt());
        assertEquals(0, page.get("totalPages").asInt());
    }

    @Test
    void shouldFilterByAnInclusiveRange() {
        // Arrange
        saveRecord(leo, JAN_10, "74");
        saveRecord(leo, JAN_12, "73");
        saveRecord(leo, JAN_14, "72.5");

        // Act + Assert
        assertEquals(List.of("2026-01-14", "2026-01-12"),
                dates(json(list(leo.getId(), "?from=2026-01-12&to=2026-01-14", ATHLETE_EMAIL))));
        // Un solo día: el flujo del 409 busca así el registro existente (contrato 8.7)
        assertEquals(List.of("2026-01-12"),
                dates(json(list(leo.getId(), "?from=2026-01-12&to=2026-01-12", ATHLETE_EMAIL))));
        assertEquals(List.of("2026-01-10"), dates(json(list(leo.getId(), "?to=2026-01-11", ATHLETE_EMAIL))));
        assertEquals(List.of("2026-01-14"), dates(json(list(leo.getId(), "?from=2026-01-13", COACH_EMAIL))));
        // "to" puede ser futura
        assertEquals(3, dates(json(list(leo.getId(), "?to=" + today().plusDays(30), ATHLETE_EMAIL))).size());
    }

    @Test
    void shouldPaginateIgnoringTheClientSort() {
        // Arrange
        saveRecord(leo, JAN_10, "74");
        saveRecord(leo, JAN_12, "73");
        saveRecord(leo, JAN_14, "72.5");

        // Act
        JsonNode page = json(list(leo.getId(), "?page=1&size=2&sort=recordedOn,asc", ATHLETE_EMAIL));

        // Assert
        assertEquals(List.of("2026-01-10"), dates(page));
        assertEquals(1, page.get("page").asInt());
        assertEquals(3, page.get("totalElements").asInt());
        assertEquals(2, page.get("totalPages").asInt());
    }

    @Test
    void shouldReturn400OnTheFromFieldWhenFromIsAfterTo() {
        // Act
        ResponseEntity<String> response = list(leo.getId(), "?from=2026-01-14&to=2026-01-10", ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        assertEquals(1, body.get("fieldErrors").size());
        assertEquals("from", body.get("fieldErrors").get(0).get("field").asString());
        assertEquals("La fecha desde no puede ser posterior a la fecha hasta",
                body.get("fieldErrors").get(0).get("message").asString());
    }

    @Test
    void shouldReturn400OnTheFieldWhenARangeDateHasAnotherFormat() {
        ResponseEntity<String> badFrom = list(leo.getId(), "?from=2026/01/10", ATHLETE_EMAIL);
        ResponseEntity<String> badTo = list(leo.getId(), "?to=abc", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, badFrom.getStatusCode());
        assertEquals(Set.of("from"), fieldErrors(badFrom));
        assertEquals(HttpStatus.BAD_REQUEST, badTo.getStatusCode());
        assertEquals(Set.of("to"), fieldErrors(badTo));
    }

    @Test
    void shouldReturn403WhenTheCoachListsAnAthleteOfAnotherCoach() {
        // Arrange
        Athlete teo = saveAthlete("teo@test.com", saveCoach("bruno@test.com"));
        saveRecord(teo, JAN_10, "80");

        // Act
        ResponseEntity<String> response = list(teo.getId(), "", COACH_EMAIL);

        // Assert: sin datos del atleta pedido
        assertAthleteForbidden(response, teo);
        assertFalse(response.getBody().contains("weightKg"));
    }

    @Test
    void shouldReturn403WhenAnAthleteListsAnotherAthlete() {
        saveRecord(mia, JAN_10, "60");

        assertAthleteForbidden(list(mia.getId(), "", ATHLETE_EMAIL), mia);
    }

    @Test
    void shouldReturn404WhenListingAnAthleteThatDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = list(missing, "", COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
    }

    @Test
    void shouldReturn401WhenListingWithoutToken() {
        assertUnauthorized(list(leo.getId(), "", null));
    }

    // ---------- helpers ----------

    private ResponseEntity<String> post(UUID athleteId, Object body, String email) {
        return exchange(HttpMethod.POST, path(athleteId), body, email, null);
    }

    private ResponseEntity<String> put(UUID athleteId, UUID weightId, Object body, String email) {
        return exchange(HttpMethod.PUT, path(athleteId) + "/" + weightId, body, email, null);
    }

    private ResponseEntity<String> list(UUID athleteId, String query, String email) {
        return exchange(HttpMethod.GET, path(athleteId) + query, null, email, null);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/weights";
    }

    // Request con la sesión de ese email, o con un token fijo (ambos null = sin token). Un body String se manda tal
    // cual (JSON roto o vacío); cualquier otro se serializa
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

    private String accessToken(String email) {
        ResponseEntity<String> response = client.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonMapper.writeValueAsString(Map.of("email", email, "password", RAW_PASSWORD)))
                .retrieve()
                .toEntity(String.class);
        return json(response).get("accessToken").asString();
    }

    // "Hoy" como lo calcula el backend (zona de la app)
    private LocalDate today() {
        return LocalDate.now(timeZoneProperties.zoneId());
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private Set<String> fieldErrors(ResponseEntity<String> response) {
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        return fields;
    }

    private static List<String> dates(JsonNode page) {
        List<String> dates = new ArrayList<>();
        page.get("content").forEach(weightRecord -> dates.add(weightRecord.get("date").asString()));
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

    private void assertRecordUnchanged(WeightRecord weightRecord, LocalDate date, String weightKg) {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select recorded_on, weight_kg, updated_at from weight_records where id = ?", weightRecord.getId());
        assertEquals(date, ((java.sql.Date) row.get("recorded_on")).toLocalDate());
        assertEquals(new BigDecimal(weightKg), row.get("weight_kg"));
        assertEquals(CREATED_AT, ((java.sql.Timestamp) row.get("updated_at")).toInstant());
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    // owner null = atleta desvinculado
    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }

    private WeightRecord saveRecord(Athlete athlete, LocalDate date, String weightKg) {
        return weightRecordRepository.saveAndFlush(weightRecord(athlete, date, weightKg));
    }

    private WeightRecord saveRecord(Athlete athlete, LocalDate date, String weightKg, String comment) {
        return weightRecordRepository.saveAndFlush(weightRecord(athlete, date, weightKg, comment));
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from weight_records", Integer.class);
        return count == null ? 0 : count;
    }

    private int countFor(Athlete athlete) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from weight_records where athlete_id = ?",
                Integer.class, athlete.getId());
        return count == null ? 0 : count;
    }
}
