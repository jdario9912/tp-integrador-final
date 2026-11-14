package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
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
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.training.exception.TrainingSessionAlreadyEndedException;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotInProgressException;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.startRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

// Finalizar y cancelar la sesión (US-20, contrato 14): el cierre con su hora y su resumen (200), el 409 si ya estaba
// cerrada, las series y el inicio después de cerrar, y la regla de rol y la pertenencia (solo el atleta dueño cierra)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class TrainingSessionEndE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";

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

    // Atleta de Ana, con la rutina "Fuerza" asignada hoy, y otra atleta de Ana (para la pertenencia)
    private Athlete leo;

    private Athlete mia;

    private Routine strength;

    private Exercise bench;

    private Exercise row;

    private Exercise squat;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = coachRepository.saveAndFlush(new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
        mia = athleteRepository.saveAndFlush(
                new Athlete("Mia", "Ruiz", OTHER_ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
        // Ejercicios propios de Ana: no chocan con los globales precargados por la V3
        bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, coach));
        row = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, coach));
        squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, coach));
        strength = saveStrengthRoutine();
        routineAssignmentRepository.saveAndFlush(assignment(leo, strength, today()));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- finalizar: 200 ----------

    @Test
    void shouldFinishTheSessionWithItsEndInstantAndSummary() {
        // Arrange: press 1 y 2 realizadas (60 × 10 y 62,5 × 8), press 3 omitida, remo 1 realizada (40 × 12)
        JsonNode torso = startTorso();
        String sessionId = torso.get("id").asString();
        recordSet(sessionId, exerciseId(torso, "Press banca"), 1, done(60, 10));
        recordSet(sessionId, exerciseId(torso, "Press banca"), 2, done(62.5, 8));
        recordSet(sessionId, exerciseId(torso, "Press banca"), 3, skipped("Molestia en el hombro"));
        recordSet(sessionId, exerciseId(torso, "Remo bajo"), 1, done(40, 12));
        Instant before = Instant.now();

        // Act
        ResponseEntity<String> response = finish(sessionId, ATHLETE_EMAIL);

        // Assert: 200, sesión finalizada con hora de fin (instante actual, no antes del inicio)
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("FINISHED", body.get("status").asString());
        Instant endedAt = Instant.parse(body.get("endedAt").asString());
        assertFalse(endedAt.isBefore(Instant.parse(torso.get("startedAt").asString())));
        assertFalse(endedAt.isBefore(before.minusSeconds(1)));
        assertFalse(endedAt.isAfter(Instant.now()));

        // Assert: el resumen. 7 prescritas (4 + 3), 3 realizadas, 1 omitida, 3 pendientes; volumen 600 + 500 + 480
        JsonNode summary = body.get("summary");
        assertEquals(7, summary.get("prescribedSets").asInt());
        assertEquals(3, summary.get("doneSets").asInt());
        assertEquals(1, summary.get("skippedSets").asInt());
        assertEquals(3, summary.get("pendingSets").asInt());
        assertEquals(1580.0, summary.get("volumeKg").asDouble());
        assertEquals(4, body.get("performedSets").size());

        // Assert: el detalle muestra el mismo cierre y la sesión ya no está en progreso; la base lo guardó
        JsonNode detail = json(get(sessionPath(sessionId), ATHLETE_EMAIL));
        assertEquals("FINISHED", detail.get("status").asString());
        assertEquals(endedAt, Instant.parse(detail.get("endedAt").asString()));
        assertEquals(HttpStatus.NO_CONTENT, get(inProgressPath(), ATHLETE_EMAIL).getStatusCode());
        assertEquals(2, statusOf(sessionId));
        assertNotNull(endedAtOf(sessionId));
    }

    @Test
    void shouldFinishWithoutSetsWithAZeroSummary() {
        // Arrange
        String sessionId = startTorso().get("id").asString();

        // Act
        ResponseEntity<String> response = finish(sessionId, ATHLETE_EMAIL);

        // Assert: el backend permite cerrar sin series (la confirmación la pide el frontend, CE-2)
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode summary = json(response).get("summary");
        assertEquals(7, summary.get("prescribedSets").asInt());
        assertEquals(0, summary.get("doneSets").asInt());
        assertEquals(0, summary.get("skippedSets").asInt());
        assertEquals(7, summary.get("pendingSets").asInt());
        assertEquals(0.0, summary.get("volumeKg").asDouble());
        assertEquals(0, json(response).get("performedSets").size());
    }

    // ---------- cancelar: 200 ----------

    @Test
    void shouldCancelTheSessionKeepingTheSetsAlreadyRecorded() {
        // Arrange: una serie realizada (50 × 5 = 250)
        JsonNode torso = startTorso();
        String sessionId = torso.get("id").asString();
        recordSet(sessionId, exerciseId(torso, "Press banca"), 1, done(50, 5));

        // Act
        ResponseEntity<String> response = cancel(sessionId, ATHLETE_EMAIL);

        // Assert: cancelada con hora de fin; la serie se conserva
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("CANCELLED", body.get("status").asString());
        assertNotNull(body.get("endedAt"));
        assertFalse(body.get("endedAt").isNull());
        assertEquals(1, body.get("performedSets").size());
        assertEquals(1, body.get("summary").get("doneSets").asInt());
        assertEquals(6, body.get("summary").get("pendingSets").asInt());
        assertEquals(250.0, body.get("summary").get("volumeKg").asDouble());
        assertEquals(3, statusOf(sessionId));
    }

    // ---------- ya cerrada: 409 ----------

    @Test
    void shouldReturn409WhenClosingAnAlreadyFinishedSessionAgain() {
        // Arrange
        String sessionId = startTorso().get("id").asString();
        assertEquals(HttpStatus.OK, finish(sessionId, ATHLETE_EMAIL).getStatusCode());
        String endedAt = endedAtOf(sessionId);

        // Act + Assert: ni finalizar ni cancelar otra vez; la hora de fin no cambia
        assertConflictAlreadyEnded(finish(sessionId, ATHLETE_EMAIL));
        assertConflictAlreadyEnded(cancel(sessionId, ATHLETE_EMAIL));
        assertEquals(2, statusOf(sessionId));
        assertEquals(endedAt, endedAtOf(sessionId));
    }

    @Test
    void shouldReturn409WhenFinishingACancelledSession() {
        // Arrange
        String sessionId = startTorso().get("id").asString();
        assertEquals(HttpStatus.OK, cancel(sessionId, ATHLETE_EMAIL).getStatusCode());

        // Act + Assert
        assertConflictAlreadyEnded(finish(sessionId, ATHLETE_EMAIL));
        assertEquals(3, statusOf(sessionId));
    }

    // ---------- después de cerrar (CE-4) ----------

    @Test
    void shouldNotRecordSetsAfterClosingButAllowStartingANewSession() {
        // Arrange: la sesión termina sin series
        JsonNode torso = startTorso();
        String sessionId = torso.get("id").asString();
        assertEquals(HttpStatus.OK, finish(sessionId, ATHLETE_EMAIL).getStatusCode());

        // Act + Assert: una serie ya no se registra (409 de US-19) y no se guarda nada
        ResponseEntity<String> set = recordSet(sessionId, exerciseId(torso, "Press banca"), 1, done(60, 10));
        assertEquals(HttpStatus.CONFLICT, set.getStatusCode());
        assertEquals(TrainingSessionNotInProgressException.MESSAGE, json(set).get("message").asString());
        assertEquals(0, count("performed_sets"));

        // Assert: ahora sí se puede iniciar otra sesión, de otro día
        ResponseEntity<String> started = start(leo.getId(), dayId(1), ATHLETE_EMAIL);
        assertEquals(HttpStatus.CREATED, started.getStatusCode());
        assertEquals("IN_PROGRESS", json(started).get("status").asString());
        assertEquals(2, count("training_sessions"));
    }

    @Test
    void shouldAllowANewSessionAfterCancelling() {
        // Arrange
        String cancelled = startTorso().get("id").asString();
        assertEquals(HttpStatus.OK, cancel(cancelled, ATHLETE_EMAIL).getStatusCode());

        // Act
        ResponseEntity<String> started = start(leo.getId(), dayId(0), ATHLETE_EMAIL);

        // Assert: la sesión nueva es la única en progreso
        assertEquals(HttpStatus.CREATED, started.getStatusCode());
        String newId = json(started).get("id").asString();
        assertFalse(newId.equals(cancelled));
        assertEquals(newId, json(get(inProgressPath(), ATHLETE_EMAIL)).get("id").asString());
    }

    // ---------- rol y pertenencia ----------

    @Test
    void shouldReturn403ToTheCoachEvenForItsOwnAthleteAndKeepTheSession() {
        String sessionId = startTorso().get("id").asString();

        ResponseEntity<String> finish = exchange(HttpMethod.POST, sessionPath(sessionId) + "/finish", null, COACH_EMAIL);
        ResponseEntity<String> cancel = exchange(HttpMethod.POST, sessionPath(sessionId) + "/cancel", null, COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, finish.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(finish).get("message").asString());
        assertEquals(HttpStatus.FORBIDDEN, cancel.getStatusCode());
        assertEquals(1, statusOf(sessionId));
    }

    @Test
    void shouldReturn403ToAnotherAthleteAndKeepTheSession() {
        String sessionId = startTorso().get("id").asString();
        String path = sessionPath(sessionId) + "/finish";

        ResponseEntity<String> response = exchange(HttpMethod.POST, path, null, OTHER_ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(response).get("message").asString());
        assertEquals(1, statusOf(sessionId));
    }

    @Test
    void shouldReturn404WhenTheSessionDoesNotExistOrIsOfAnotherAthlete() {
        // Arrange: una sesión de Leo que Mía intenta cerrar desde su propia ruta
        String leosSession = startTorso().get("id").asString();
        String unknown = UUID.randomUUID().toString();

        // Act + Assert: la misma respuesta para un id inexistente y para uno ajeno
        ResponseEntity<String> unknownResponse = exchange(HttpMethod.POST, athleteSessionsPath(leo.getId()) + "/"
                + unknown + "/finish", null, ATHLETE_EMAIL);
        assertEquals(HttpStatus.NOT_FOUND, unknownResponse.getStatusCode());
        assertEquals("No existe la sesión de entrenamiento con id " + unknown,
                json(unknownResponse).get("message").asString());

        ResponseEntity<String> otherAthleteResponse = exchange(HttpMethod.POST,
                athleteSessionsPath(mia.getId()) + "/" + leosSession + "/cancel", null, OTHER_ATHLETE_EMAIL);
        assertEquals(HttpStatus.NOT_FOUND, otherAthleteResponse.getStatusCode());
        assertEquals(1, statusOf(leosSession));
    }

    @Test
    void shouldReturn401WithoutTokenAnd400WhenTheSessionIdIsNotAUuid() {
        String sessionId = startTorso().get("id").asString();

        ResponseEntity<String> noToken = exchange(HttpMethod.POST, sessionPath(sessionId) + "/finish", null, null);
        assertEquals(HttpStatus.UNAUTHORIZED, noToken.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(noToken).get("message").asString());

        assertEquals(HttpStatus.BAD_REQUEST, exchange(HttpMethod.POST,
                athleteSessionsPath(leo.getId()) + "/no-es-un-uuid/finish", null, ATHLETE_EMAIL).getStatusCode());
        assertEquals(1, statusOf(sessionId));
    }

    // ---------- helpers ----------

    // Torso (press con todos los parámetros y remo con los obligatorios) y Pierna (sentadilla)
    private Routine saveStrengthRoutine() {
        Routine routine = routine("Fuerza", coach);
        routine.setDurationWeeks((short) 8);
        RoutineDay upper = routine.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(RoutineExercise.builder().exercise(row).sets((short) 3).reps((short) 12).build());
        routine.addDay("Pierna").addExercise(routineExercise(squat));
        return routineRepository.saveAndFlush(routine);
    }

    // Inicia el día 1 (Torso) de la rutina asignada a Leo y devuelve la sesión
    private JsonNode startTorso() {
        ResponseEntity<String> response = start(leo.getId(), dayId(0), ATHLETE_EMAIL);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        return json(response);
    }

    private UUID dayId(int index) {
        return strength.getDays().get(index).getId();
    }

    private ResponseEntity<String> start(UUID athleteId, UUID routineDayId, String email) {
        return exchange(HttpMethod.POST, athleteSessionsPath(athleteId), startRequest(routineDayId), email);
    }

    private ResponseEntity<String> finish(String sessionId, String email) {
        return exchange(HttpMethod.POST, sessionPath(sessionId) + "/finish", null, email);
    }

    private ResponseEntity<String> cancel(String sessionId, String email) {
        return exchange(HttpMethod.POST, sessionPath(sessionId) + "/cancel", null, email);
    }

    // PUT de una serie de Leo sobre su sesión: el mismo cuerpo que el de US-19
    private ResponseEntity<String> recordSet(String sessionId, String routineExerciseId, int setNumber,
                                             Map<String, Object> body) {
        return exchange(HttpMethod.PUT, sessionPath(sessionId) + "/exercises/" + routineExerciseId + "/sets/"
                + setNumber, body, ATHLETE_EMAIL);
    }

    private static Map<String, Object> done(double weight, int reps) {
        return Map.of("status", "DONE", "weight", weight, "reps", reps);
    }

    private static Map<String, Object> skipped(String reason) {
        return Map.of("status", "SKIPPED", "skipReason", reason);
    }

    // Id del ejercicio del día (day.exercises[].id de la sesión) por su nombre
    private static String exerciseId(JsonNode session, String exerciseName) {
        for (JsonNode exercise : session.get("day").get("exercises")) {
            if (exercise.get("exerciseName").asString().equals(exerciseName)) {
                return exercise.get("id").asString();
            }
        }
        throw new IllegalArgumentException("No hay un ejercicio " + exerciseName + " en el día");
    }

    private ResponseEntity<String> get(String uri, String email) {
        return exchange(HttpMethod.GET, uri, null, email);
    }

    private static String athleteSessionsPath(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/sessions";
    }

    private String sessionPath(String sessionId) {
        return athleteSessionsPath(leo.getId()) + "/" + sessionId;
    }

    private String inProgressPath() {
        return athleteSessionsPath(leo.getId()) + "/in-progress";
    }

    // Request con la sesión de ese email (null = sin token). Un body Map se serializa; sin body, no se manda
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

    private void assertConflictAlreadyEnded(ResponseEntity<String> response) {
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(TrainingSessionAlreadyEndedException.MESSAGE, json(response).get("message").asString());
    }

    // "Hoy" como lo calcula el backend (zona de la app)
    private LocalDate today() {
        return LocalDate.now(timeZoneProperties.zoneId());
    }

    private int statusOf(String sessionId) {
        return jdbcTemplate.queryForObject("select status_id from training_sessions where id = ?::uuid", Integer.class,
                sessionId);
    }

    // Como texto ISO: la base la devuelve tal cual, así se compara la hora de fin sin depender del mapeo del driver
    private String endedAtOf(String sessionId) {
        return jdbcTemplate.queryForObject("select ended_at::text from training_sessions where id = ?::uuid",
                String.class, sessionId);
    }

    private int count(String table) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }
}
