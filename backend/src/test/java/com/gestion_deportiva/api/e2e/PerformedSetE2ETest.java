package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.exception.RoutineHasPerformedSetsException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotInProgressException;
import com.gestion_deportiva.api.training.exception.RoutineExerciseNotInSessionDayException;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Series registradas en vivo (US-19, contrato 11): el PUT de una serie (200 con la sesión completa, idempotente, con
// corrección), los errores en su orden (401, 403, 400, 404, 409, 422), las lecturas con performedSets y el checker
// real al quitar de la rutina un ejercicio con series (422)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class PerformedSetE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";
    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    private static final String MALFORMED_MESSAGE = "El cuerpo de la solicitud no es un JSON válido";

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
    private ExerciseRepository exerciseRepository;

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private RoutineAssignmentRepository routineAssignmentRepository;

    @Autowired
    private TimeZoneProperties timeZoneProperties;

    private RestClient client;

    private Coach coach;

    private Athlete leo;

    private Athlete mia;

    private Routine strength;

    // Ids de la base: día Torso (press 4 series, remo 3) y día Pierna (sentadilla 4)
    private UUID torsoId;

    private UUID piernaId;

    private UUID pressId;

    private UUID rowId;

    private UUID squatId;

    private UUID rowExerciseId;

    private UUID squatExerciseId;

    // Sesión de Leo en progreso, del día Torso
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        coach = saveCoach(COACH_EMAIL);
        saveCoach(OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, coach);
        mia = saveAthlete(OTHER_ATHLETE_EMAIL, coach);

        Exercise press = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, coach));
        Exercise row = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, coach));
        Exercise squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, coach));
        rowExerciseId = row.getId();
        squatExerciseId = squat.getId();

        strength = routine("Fuerza", coach);
        strength.setDurationWeeks((short) 8);
        RoutineDay upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(press));
        upper.addExercise(RoutineExercise.builder().exercise(row).sets((short) 3).reps((short) 12).build());
        strength.addDay("Pierna").addExercise(routineExercise(squat));
        strength = routineRepository.saveAndFlush(strength);
        routineAssignmentRepository.saveAndFlush(assignment(leo, strength, today()));

        torsoId = dayId(1);
        piernaId = dayId(2);
        pressId = routineExerciseId(torsoId, 0);
        rowId = routineExerciseId(torsoId, 1);
        squatId = routineExerciseId(piernaId, 0);
        sessionId = UUID.fromString(json(start(leo.getId(), torsoId, ATHLETE_EMAIL)).get("id").asString());
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también las series
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- registrar y corregir: 200 ----------

    @Test
    void shouldRegisterADoneSetAndReturnTheWholeSession() {
        // Act: la serie 1 del press, con los valores precargados
        ResponseEntity<String> response = put(pressId, 1, done("62.5", 8, 8), ATHLETE_EMAIL);

        // Assert: 200 y la sesión completa, con la serie
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(sessionId.toString(), body.get("id").asString());
        assertEquals("IN_PROGRESS", body.get("status").asString());
        assertEquals("Torso", body.get("day").get("name").asString());
        JsonNode set = onlySet(body);
        assertEquals(pressId.toString(), set.get("routineExerciseId").asString());
        assertEquals(1, set.get("setNumber").asInt());
        assertEquals("DONE", set.get("status").asString());
        assertEquals(62.5, set.get("weight").asDouble());
        assertEquals(8, set.get("reps").asInt());
        assertEquals(8, set.get("rpe").asInt());
        assertTrue(set.get("skipReason").isNull());
        assertEquals(1, count());
    }

    @Test
    void shouldRegisterADoneSetWithoutRpe() {
        ResponseEntity<String> response = put(pressId, 1, done("60", 10, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(onlySet(json(response)).get("rpe").isNull());
    }

    @Test
    void shouldRegisterASkippedSetWithItsReasonAndDiscardTheValuesThatCameWithIt() {
        // Arrange: el cliente manda el formulario entero (peso y reps) y el motivo
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "SKIPPED");
        body.put("weight", new BigDecimal("60"));
        body.put("reps", 8);
        body.put("rpe", 7);
        body.put("skipReason", "  Dolor de rodilla ");

        // Act
        ResponseEntity<String> response = put(pressId, 2, body, ATHLETE_EMAIL);

        // Assert: se descartan peso, reps y RPE; el motivo sale sin espacios
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode set = onlySet(json(response));
        assertEquals("SKIPPED", set.get("status").asString());
        assertEquals(2, set.get("setNumber").asInt());
        assertTrue(set.get("weight").isNull());
        assertTrue(set.get("reps").isNull());
        assertTrue(set.get("rpe").isNull());
        assertEquals("Dolor de rodilla", set.get("skipReason").asString());
    }

    @Test
    void shouldNotDuplicateTheSetWhenTheSameRequestIsRetried() {
        // Arrange: falla la red después de que el servidor guardó la serie: el cliente reenvía lo mismo
        Map<String, Object> body = done("62.5", 8, 8);

        // Act
        ResponseEntity<String> first = put(pressId, 1, body, ATHLETE_EMAIL);
        ResponseEntity<String> retry = put(pressId, 1, body, ATHLETE_EMAIL);

        // Assert: la misma respuesta y una sola fila
        assertEquals(HttpStatus.OK, retry.getStatusCode());
        assertEquals(1, json(retry).get("performedSets").size());
        assertEquals(onlySet(json(first)).get("id").asString(), onlySet(json(retry)).get("id").asString());
        assertEquals(1, count());
    }

    @Test
    void shouldCorrectASetByRegisteringItAgainWithTheSameNumber() {
        put(pressId, 1, done("62.5", 8, 8), ATHLETE_EMAIL);

        // Act: corrijo las repeticiones y el peso
        ResponseEntity<String> response = put(pressId, 1, done("65", 6, null), ATHLETE_EMAIL);

        // Assert: la misma serie con los valores nuevos, sin fila nueva
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode set = onlySet(json(response));
        assertEquals(65, set.get("weight").asDouble());
        assertEquals(6, set.get("reps").asInt());
        assertTrue(set.get("rpe").isNull());
        assertEquals(1, count());
    }

    @Test
    void shouldChangeBetweenDoneAndSkippedInBothDirections() {
        put(pressId, 1, done("62.5", 8, 8), ATHLETE_EMAIL);

        // Omitida con motivo: los valores de la realizada desaparecen
        JsonNode skipped = onlySet(json(put(pressId, 1, skipped("Sin tiempo"), ATHLETE_EMAIL)));
        assertEquals("SKIPPED", skipped.get("status").asString());
        assertTrue(skipped.get("weight").isNull());

        // Vuelve a realizada: el motivo se borra
        JsonNode done = onlySet(json(put(pressId, 1, done("60", 10, null), ATHLETE_EMAIL)));
        assertEquals("DONE", done.get("status").asString());
        assertTrue(done.get("skipReason").isNull());
        assertEquals(1, count());
    }

    // ---------- lecturas ----------

    @Test
    void shouldReturnThePerformedSetsOrderedByExerciseAndSetNumberInTheReads() {
        // Arrange: se registran desordenadas (remo antes que el press, serie 2 antes que la 1)
        put(rowId, 1, done("20", 12, null), ATHLETE_EMAIL);
        put(pressId, 2, done("60", 10, null), ATHLETE_EMAIL);
        put(pressId, 1, skipped("Sin tiempo"), ATHLETE_EMAIL);

        // Act: el detalle y la sesión en progreso
        JsonNode detail = json(get(sessionPath(), ATHLETE_EMAIL));
        JsonNode inProgress = json(get(inProgressPath(), COACH_EMAIL));

        // Assert: el orden del día (press antes que remo) y luego el número de serie; el entrenador también lo ve
        assertEquals(List.of(pressId + "/1", pressId + "/2", rowId + "/1"), keys(detail));
        assertEquals(List.of(pressId + "/1", pressId + "/2", rowId + "/1"), keys(inProgress));
    }

    @Test
    void shouldReturnAnEmptyListWhileNothingIsRegistered() {
        JsonNode detail = json(get(sessionPath(), ATHLETE_EMAIL));

        assertTrue(detail.get("performedSets").isArray());
        assertEquals(0, detail.get("performedSets").size());
    }

    // ---------- errores de validación: 400 ----------

    @Test
    void shouldReturn400WithTheFieldMessagesOfAnInvalidDoneSet() {
        // Peso negativo, repeticiones fuera de rango y RPE fuera de rango
        ResponseEntity<String> response = put(pressId, 1, done("-1", 0, 11), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(response).get("message").asString());
        assertEquals("El peso no puede ser negativo", fieldMessage(response, "weight"));
        assertEquals("Las repeticiones deben estar entre 1 y 999", fieldMessage(response, "reps"));
        assertEquals("El RPE debe estar entre 1 y 10", fieldMessage(response, "rpe"));
        assertEquals(0, count());
    }

    @Test
    void shouldAskForWeightAndRepsOfADoneSet() {
        ResponseEntity<String> response = put(pressId, 1, done(null, null, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Ingresá el peso de una serie realizada", fieldMessage(response, "weight"));
        assertEquals("Ingresá las repeticiones de una serie realizada", fieldMessage(response, "reps"));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenASkippedSetHasNoReasonOr201Characters() {
        // CE-5: omitida sin motivo
        ResponseEntity<String> noReason = put(pressId, 1, skipped("   "), ATHLETE_EMAIL);
        ResponseEntity<String> tooLong = put(pressId, 1, skipped("x".repeat(201)), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, noReason.getStatusCode());
        assertEquals("Ingresá el motivo de una serie omitida", fieldMessage(noReason, "skipReason"));
        assertEquals("El motivo no puede superar los 200 caracteres", fieldMessage(tooLong, "skipReason"));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenTheStatusIsMissingOrUnknown() {
        ResponseEntity<String> missing = put(pressId, 1, Map.of("weight", "60", "reps", 8), ATHLETE_EMAIL);
        ResponseEntity<String> unknown = exchange(HttpMethod.PUT, setPath(pressId, 1),
                "{\"status\": \"PENDING\"}", ATHLETE_EMAIL);

        assertEquals("Ingresá el estado de la serie", fieldMessage(missing, "status"));
        assertEquals(HttpStatus.BAD_REQUEST, unknown.getStatusCode());
        assertEquals(MALFORMED_MESSAGE, json(unknown).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenAnIdOrTheSetNumberIsNotValid() {
        assertEquals(HttpStatus.BAD_REQUEST, exchange(HttpMethod.PUT,
                "/api/athletes/" + leo.getId() + "/sessions/" + sessionId + "/exercises/no-es-un-uuid/sets/1",
                done("60", 8, null), ATHLETE_EMAIL).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, exchange(HttpMethod.PUT,
                setPath(pressId, "uno"), done("60", 8, null), ATHLETE_EMAIL).getStatusCode());
    }

    // ---------- sesión, ejercicio y serie: 409 y 422 ----------

    @Test
    void shouldReturn409WhenTheSessionIsNoLongerInProgress() {
        // CE-2: la sesión terminó (la finalización es de US-20; acá se simula en la base)
        jdbcTemplate.update("update training_sessions set status_id = 2, ended_at = started_at where id = ?", sessionId);

        ResponseEntity<String> response = put(pressId, 1, done("60", 8, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(TrainingSessionNotInProgressException.MESSAGE, json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldAnswer409BeforeTheExerciseAndSetChecksWhenTheSessionIsClosed() {
        jdbcTemplate.update("update training_sessions set status_id = 3, ended_at = started_at where id = ?", sessionId);

        // Un ejercicio de otro día y una serie fuera de rango: con la sesión cerrada, el 409 gana
        ResponseEntity<String> response = put(squatId, 9, done("60", 8, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void shouldReturn422ForAnExerciseOfAnotherDayOrAnUnknownOne() {
        // CE-3: la sentadilla es del día Pierna, no de la sesión del Torso
        ResponseEntity<String> otherDay = put(squatId, 1, done("60", 8, null), ATHLETE_EMAIL);
        ResponseEntity<String> unknown = put(UUID.randomUUID(), 1, done("60", 8, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, otherDay.getStatusCode());
        assertEquals(RoutineExerciseNotInSessionDayException.MESSAGE, json(otherDay).get("message").asString());
        assertEquals(RoutineExerciseNotInSessionDayException.MESSAGE, json(unknown).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn422ForASetOutsideThePrescribedSets() {
        // El press tiene 4 series y el remo, 3: la 0, la 5 y la 4 del remo no existen
        ResponseEntity<String> zero = put(pressId, 0, done("60", 8, null), ATHLETE_EMAIL);
        ResponseEntity<String> fifth = put(pressId, 5, done("60", 8, null), ATHLETE_EMAIL);
        ResponseEntity<String> rowFourth = put(rowId, 4, done("20", 12, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, zero.getStatusCode());
        assertEquals("El ejercicio tiene 4 series: la serie 0 no existe", json(zero).get("message").asString());
        assertEquals("El ejercicio tiene 4 series: la serie 5 no existe", json(fifth).get("message").asString());
        assertEquals("El ejercicio tiene 3 series: la serie 4 no existe",
                json(rowFourth).get("message").asString());
        assertEquals(0, count());
    }

    // ---------- rol, pertenencia, 404 y 401 ----------

    @Test
    void shouldReturn403ToTheCoachEvenForItsOwnAthlete() {
        // CE-4 por rol: el entrenador no registra series, aunque el atleta sea suyo
        ResponseEntity<String> response = put(pressId, 1, done("60", 8, null), COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn403ToAnotherAthleteAndAnotherCoach() {
        // CE-4 por pertenencia: la sesión de Leo no es de Mía ni de otro entrenador
        ResponseEntity<String> otherAthlete = put(pressId, 1, done("60", 8, null), OTHER_ATHLETE_EMAIL);
        ResponseEntity<String> otherCoach = put(pressId, 1, done("60", 8, null), OTHER_COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, otherAthlete.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(otherAthlete).get("message").asString());
        assertEquals(HttpStatus.FORBIDDEN, otherCoach.getStatusCode());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn404WhenTheAthleteOrTheSessionDoesNotExist() {
        UUID missingAthlete = UUID.randomUUID();
        UUID missingSession = UUID.randomUUID();
        ResponseEntity<String> athlete = exchange(HttpMethod.PUT,
                "/api/athletes/" + missingAthlete + "/sessions/" + sessionId + "/exercises/" + pressId + "/sets/1",
                done("60", 8, null), ATHLETE_EMAIL);
        ResponseEntity<String> session = put(missingSession, pressId, 1, done("60", 8, null), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, athlete.getStatusCode());
        assertEquals("No existe el atleta con id " + missingAthlete, json(athlete).get("message").asString());
        assertEquals(HttpStatus.NOT_FOUND, session.getStatusCode());
        assertEquals("No existe la sesión de entrenamiento con id " + missingSession,
                json(session).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn404ForASessionOfAnotherAthleteEvenWhenTheRouteIsOwnedByTheCaller() {
        // Arrange: Mía también entrena (su propia sesión) y Leo pide la de Mía por su ruta
        routineAssignmentRepository.saveAndFlush(assignment(mia, strength, today()));
        UUID miaSessionId = UUID.fromString(json(start(mia.getId(), torsoId, OTHER_ATHLETE_EMAIL))
                .get("id").asString());

        // Act: Leo es el dueño de la ruta, así que pasa la pertenencia; la sesión no es suya
        ResponseEntity<String> response = put(miaSessionId, pressId, 1, done("60", 8, null), ATHLETE_EMAIL);

        // Assert: 404 (no 403), para no revelar que el id existe
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe la sesión de entrenamiento con id " + miaSessionId,
                json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn401WithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.PUT, setPath(pressId, 1),
                done("60", 8, null), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    // ---------- checker: quitar de la rutina un ejercicio con series (CE-7) ----------

    @Test
    void shouldRefuseToRemoveAnExerciseThatHasRegisteredSets() {
        // Arrange: una serie del press
        put(pressId, 1, done("60", 8, null), ATHLETE_EMAIL);

        // Act: el entrenador quita el press del Torso (deja solo el remo)
        Map<String, Object> structure = Map.of("days", List.of(Map.of(
                "id", torsoId,
                "name", "Torso",
                "exercises", List.of(Map.of("id", rowId, "exerciseId", rowExerciseId, "sets", 3, "reps", 12)))));
        ResponseEntity<String> response = exchange(HttpMethod.PUT, "/api/routines/" + strength.getId() + "/days",
                structure, COACH_EMAIL);

        // Assert: 422 y la serie sigue
        assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, response.getStatusCode());
        assertEquals(new RoutineHasPerformedSetsException().getMessage(), json(response).get("message").asString());
        assertEquals(1, count());
    }

    // ---------- helpers ----------

    // Serie realizada o corregida: el mismo body que manda el cliente
    private static Map<String, Object> done(String weight, Integer reps, Integer rpe) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "DONE");
        body.put("weight", weight == null ? null : new BigDecimal(weight));
        body.put("reps", reps);
        body.put("rpe", rpe);
        return body;
    }

    private static Map<String, Object> skipped(String reason) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "SKIPPED");
        body.put("skipReason", reason);
        return body;
    }

    private ResponseEntity<String> put(UUID routineExerciseId, Object setNumber, Object body, String email) {
        return exchange(HttpMethod.PUT, setPath(routineExerciseId, setNumber), body, email);
    }

    private ResponseEntity<String> put(UUID sessionId, UUID routineExerciseId, Object setNumber, Object body,
                                       String email) {
        return exchange(HttpMethod.PUT, sessionPath(leo.getId(), sessionId) + "/exercises/" + routineExerciseId
                + "/sets/" + setNumber, body, email);
    }

    private String setPath(UUID routineExerciseId, Object setNumber) {
        return sessionPath(leo.getId(), sessionId) + "/exercises/" + routineExerciseId + "/sets/" + setNumber;
    }

    private String sessionPath() {
        return sessionPath(leo.getId(), sessionId);
    }

    private String inProgressPath() {
        return "/api/athletes/" + leo.getId() + "/sessions/in-progress";
    }

    private static String sessionPath(UUID athleteId, UUID sessionId) {
        return "/api/athletes/" + athleteId + "/sessions/" + sessionId;
    }

    private ResponseEntity<String> start(UUID athleteId, UUID routineDayId, String email) {
        return exchange(HttpMethod.POST, "/api/athletes/" + athleteId + "/sessions",
                Map.of("routineDayId", routineDayId), email);
    }

    private ResponseEntity<String> get(String uri, String email) {
        return exchange(HttpMethod.GET, uri, null, email);
    }

    // Request con la cuenta de ese email (null = sin token). Un body String se manda tal cual; cualquier otro se
    // serializa
    private ResponseEntity<String> exchange(HttpMethod method, String uri, Object body, String email) {
        RestClient.RequestBodySpec request = client.method(method)
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
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

    // La única serie de la respuesta (en los tests que registran una sola)
    private static JsonNode onlySet(JsonNode sessionBody) {
        assertEquals(1, sessionBody.get("performedSets").size());
        return sessionBody.get("performedSets").get(0);
    }

    // "routineExerciseId/setNumber" de cada serie, en el orden de la respuesta
    private static List<String> keys(JsonNode sessionBody) {
        List<String> keys = new ArrayList<>();
        sessionBody.get("performedSets").forEach(set -> keys.add(
                set.get("routineExerciseId").asString() + "/" + set.get("setNumber").asInt()));
        return keys;
    }

    private String fieldMessage(ResponseEntity<String> response, String field) {
        for (JsonNode error : json(response).get("fieldErrors")) {
            if (error.get("field").asString().equals(field)) {
                return error.get("message").asString();
            }
        }
        throw new AssertionError("Sin error para el campo " + field + ": " + response.getBody());
    }

    private UUID dayId(int dayNumber) {
        return jdbcTemplate.queryForObject("select id from routine_days where routine_id = ? and day_number = ?",
                UUID.class, strength.getId(), (short) dayNumber);
    }

    private UUID routineExerciseId(UUID dayId, int sortOrder) {
        return jdbcTemplate.queryForObject(
                "select id from routine_exercises where routine_day_id = ? and sort_order = ?", UUID.class, dayId,
                (short) sortOrder);
    }

    // "Hoy" como lo calcula el backend (zona de la app)
    private LocalDate today() {
        return LocalDate.now(timeZoneProperties.zoneId());
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from performed_sets", Integer.class);
        return count == null ? 0 : count;
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }
}
