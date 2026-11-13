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
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.model.RoutineExercise;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.training.exception.EmptyRoutineDayException;
import com.gestion_deportiva.api.training.exception.NoActiveRoutineException;
import com.gestion_deportiva.api.training.exception.RoutineDayNotInActiveRoutineException;
import com.gestion_deportiva.api.training.exception.TrainingSessionInProgressException;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.session;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.startRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Sesiones de entrenamiento (US-18, contrato 10): iniciar (201, 409, 422), la sesión en progreso (200/204) y el
// detalle (200/404), con la regla de rol (solo el atleta inicia) y la pertenencia (el atleta, solo las suyas; el
// entrenador, las de sus atletas vinculados)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class TrainingSessionE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

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
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private TimeZoneProperties timeZoneProperties;

    private RestClient client;

    private Coach coach;

    // Atleta de Ana
    private Athlete leo;

    private Exercise bench;

    private Exercise row;

    private Exercise squat;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = saveCoach(COACH_EMAIL);
        saveCoach(OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, coach);
        // Ejercicios propios de Ana: no chocan con los globales precargados por la V3
        bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, coach));
        row = exerciseRepository.saveAndFlush(exercise("Remo bajo", MuscleGroup.BACK, coach));
        squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, coach));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también athletes,
    // exercises, routines (con sus días y ejercicios), routine_assignments y training_sessions
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- iniciar: 201 ----------

    @Test
    void shouldReturn201WithTheSessionInProgressAndItsLocation() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        RoutineAssignment active = assign(leo, strength, today());
        RoutineDay upper = day(strength, 0);
        Instant before = Instant.now();

        // Act
        ResponseEntity<String> response = start(leo.getId(), upper.getId(), ATHLETE_EMAIL);

        // Assert: sesión en progreso con la fecha de hoy (zona de la app) y la hora de inicio
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertEquals("IN_PROGRESS", body.get("status").asString());
        assertEquals(today().toString(), body.get("sessionDate").asString());
        Instant startedAt = Instant.parse(body.get("startedAt").asString());
        assertFalse(startedAt.isBefore(before.minusSeconds(1)));
        assertFalse(startedAt.isAfter(Instant.now()));
        assertEquals(active.getId().toString(), body.get("assignmentId").asString());
        assertEquals(strength.getId().toString(), body.get("routineId").asString());
        assertEquals("Fuerza", body.get("routineName").asString());
        assertFalse(body.has("athleteId"));

        // Assert: el día con sus ejercicios planificados, como en US-14/US-17
        JsonNode day = body.get("day");
        assertEquals(upper.getId().toString(), day.get("id").asString());
        assertEquals(1, day.get("dayNumber").asInt());
        assertEquals("Torso", day.get("name").asString());
        assertEquals(List.of("Press banca", "Remo bajo"), exerciseNames(day));
        JsonNode press = day.get("exercises").get(0);
        assertEquals(bench.getId().toString(), press.get("exerciseId").asString());
        assertEquals("CHEST", press.get("muscleGroup").asString());
        assertEquals(4, press.get("sets").asInt());
        assertEquals(10, press.get("reps").asInt());
        assertEquals(60.5, press.get("recommendedWeight").asDouble());
        assertEquals(90, press.get("rest").asInt());
        assertEquals("RIR 2", press.get("rirRpe").asString());
        assertTrue(day.get("exercises").get(1).get("recommendedWeight").isNull());

        // Assert: Location al detalle y la fila en la base (status_id 1 = IN_PROGRESS)
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(sessionsPath(leo.getId()) + "/" + id));
        assertEquals(1, count());
        assertEquals(1, jdbcTemplate.queryForObject("select status_id from training_sessions where id = ?::uuid",
                Integer.class, id));
    }

    @Test
    void shouldStartAnyDayOfTheActiveRoutine() {
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());

        ResponseEntity<String> response = start(leo.getId(), day(strength, 1).getId(), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("Pierna", json(response).get("day").get("name").asString());
        assertEquals(List.of("Sentadilla"), exerciseNames(json(response).get("day")));
    }

    @Test
    void shouldStartOnTheLastValidDayOfTheRoutine() {
        // Arrange: 1 semana desde hace 6 días → hoy es el último día vigente
        Routine strength = saveStrengthRoutine((short) 1);
        assign(leo, strength, today().minusDays(6));

        // Act + Assert
        assertEquals(HttpStatus.CREATED, start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL).getStatusCode());
    }

    @Test
    void shouldLetAnUnlinkedAthleteStartButNotItsFormerCoachReadIt() {
        // Arrange: la desvinculación (US-07) no toca la asignación activa (D-018)
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        leo.unassignCoach();
        athleteRepository.saveAndFlush(leo);

        // Act
        ResponseEntity<String> response = start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        String id = json(response).get("id").asString();
        assertEquals(HttpStatus.OK, get(inProgressPath(leo.getId()), ATHLETE_EMAIL).getStatusCode());
        assertAthleteForbidden(get(inProgressPath(leo.getId()), COACH_EMAIL), inProgressPath(leo.getId()));
        assertAthleteForbidden(get(sessionsPath(leo.getId()) + "/" + id, COACH_EMAIL),
                sessionsPath(leo.getId()) + "/" + id);
    }

    // ---------- iniciar: 409 ----------

    @Test
    void shouldReturn409WhenThereIsAlreadyASessionInProgress() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL);

        // Act: otro día
        ResponseEntity<String> response = start(leo.getId(), day(strength, 1).getId(), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(TrainingSessionInProgressException.MESSAGE, json(response).get("message").asString());
        assertEquals(1, count());
    }

    @Test
    void shouldReturn409BeforeTheExpirationWhenTheOpenSessionIsFromAnExpiredRoutine() {
        // Arrange: la empezó ayer, el último día vigente; hoy la rutina ya está vencida
        Routine strength = saveStrengthRoutine((short) 1);
        RoutineAssignment expired = assign(leo, strength, today().minusWeeks(1));
        trainingSessionRepository.saveAndFlush(session(expired, day(strength, 0), today().minusDays(1)));

        // Act
        ResponseEntity<String> response = start(leo.getId(), day(strength, 1).getId(), ATHLETE_EMAIL);

        // Assert: 409 (retomarla) y no 422
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(TrainingSessionInProgressException.MESSAGE, json(response).get("message").asString());
    }

    // ---------- iniciar: 422 ----------

    @Test
    void shouldReturn422WithoutAnActiveRoutine() {
        // Arrange: solo una asignación que quedó en el historial
        Routine strength = saveStrengthRoutine((short) 8);
        RoutineAssignment previous = assignment(leo, strength, today().minusMonths(3));
        previous.deactivate();
        routineAssignmentRepository.saveAndFlush(previous);

        // Act
        ResponseEntity<String> response = start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL);

        // Assert
        assertUnprocessable(response, NoActiveRoutineException.MESSAGE);
    }

    @Test
    void shouldReturn422WhenTheRoutineIsExpired() {
        // Arrange: 1 semana desde hace 7 días → el último día vigente fue ayer
        Routine strength = saveStrengthRoutine((short) 1);
        assign(leo, strength, today().minusWeeks(1));

        // Act
        ResponseEntity<String> response = start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL);

        // Assert: el mensaje nombra el último día vigente
        assertUnprocessable(response, "Tu rutina venció el " + DISPLAY_DATE.format(today().minusDays(1))
                + ". Pedile a tu entrenador una nueva");
    }

    @Test
    void shouldReturn422WhenTheDayIsNotOfTheActiveRoutine() {
        // Arrange: un día de otra rutina de Ana, uno de la asignación anterior y uno inexistente
        Routine previousRoutine = saveRoutine("Anterior", (short) 8);
        RoutineAssignment previous = assignment(leo, previousRoutine, today().minusMonths(3));
        previous.deactivate();
        routineAssignmentRepository.saveAndFlush(previous);
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        Routine other = saveRoutine("Otra", (short) 8);

        // Act + Assert: el mismo mensaje en los tres casos
        assertUnprocessable(start(leo.getId(), day(other, 0).getId(), ATHLETE_EMAIL),
                RoutineDayNotInActiveRoutineException.MESSAGE);
        assertUnprocessable(start(leo.getId(), day(previousRoutine, 0).getId(), ATHLETE_EMAIL),
                RoutineDayNotInActiveRoutineException.MESSAGE);
        assertUnprocessable(start(leo.getId(), UUID.randomUUID(), ATHLETE_EMAIL),
                RoutineDayNotInActiveRoutineException.MESSAGE);
    }

    @Test
    void shouldReturn422WhenTheDayHasNoExercises() {
        // Arrange: Torso, Pierna y Movilidad (sin ejercicios: el entrenador lo vació después de asignar)
        Routine strength = strengthRoutine("Fuerza", (short) 8);
        strength.addDay("Movilidad");
        strength = routineRepository.saveAndFlush(strength);
        assign(leo, strength, today());

        // Act + Assert
        assertUnprocessable(start(leo.getId(), day(strength, 2).getId(), ATHLETE_EMAIL),
                EmptyRoutineDayException.MESSAGE);
    }

    // ---------- iniciar: rol, pertenencia, 404, 401 y 400 ----------

    @Test
    void shouldReturn403ToTheCoachEvenForItsOwnAthlete() {
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());

        ResponseEntity<String> response = start(leo.getId(), day(strength, 0).getId(), COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn403ToAnotherAthlete() {
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        saveAthlete(OTHER_ATHLETE_EMAIL, coach);

        ResponseEntity<String> response = start(leo.getId(), day(strength, 0).getId(), OTHER_ATHLETE_EMAIL);

        assertAthleteForbidden(response, sessionsPath(leo.getId()));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn404WhenStartingForAnAthleteThatDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = start(missing, UUID.randomUUID(), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
    }

    @Test
    void shouldReturn401WhenStartingWithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, sessionsPath(leo.getId()),
                startRequest(UUID.randomUUID()), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn400WhenTheDayIsMissing() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, sessionsPath(leo.getId()), "{}", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode error = json(response).get("fieldErrors").get(0);
        assertEquals("routineDayId", error.get("field").asString());
        assertEquals("El día de la rutina es obligatorio", error.get("message").asString());
    }

    @Test
    void shouldReturn400WhenTheDayIsNotAUuid() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, sessionsPath(leo.getId()),
                "{\"routineDayId\": \"no-es-un-uuid\"}", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("El cuerpo de la solicitud no es un JSON válido", json(response).get("message").asString());
    }

    // ---------- sesión en progreso ----------

    @Test
    void shouldReturn204WithoutBodyWhenThereIsNoSessionInProgress() {
        assign(leo, saveStrengthRoutine((short) 8), today());

        ResponseEntity<String> own = get(inProgressPath(leo.getId()), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NO_CONTENT, own.getStatusCode());
        assertTrue(own.getBody() == null || own.getBody().isEmpty());
        assertEquals(HttpStatus.NO_CONTENT, get(inProgressPath(leo.getId()), COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturnTheSessionInProgressToTheAthleteAndItsCoach() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        String id = json(start(leo.getId(), day(strength, 1).getId(), ATHLETE_EMAIL)).get("id").asString();

        // Act
        ResponseEntity<String> own = get(inProgressPath(leo.getId()), ATHLETE_EMAIL);
        ResponseEntity<String> fromCoach = get(inProgressPath(leo.getId()), COACH_EMAIL);

        // Assert: la misma representación que el alta
        assertEquals(HttpStatus.OK, own.getStatusCode());
        JsonNode body = json(own);
        assertEquals(id, body.get("id").asString());
        assertEquals("IN_PROGRESS", body.get("status").asString());
        assertEquals("Pierna", body.get("day").get("name").asString());
        assertEquals(List.of("Sentadilla"), exerciseNames(body.get("day")));
        assertEquals(HttpStatus.OK, fromCoach.getStatusCode());
        assertEquals(id, json(fromCoach).get("id").asString());
    }

    @Test
    void shouldReturn403ForTheSessionInProgressBeforeRevealingWhetherThereIsOne() {
        // Arrange: Leo no tiene sesión; si el 204 se evaluara antes de la pertenencia, Mía y Bruno se enterarían
        saveAthlete(OTHER_ATHLETE_EMAIL, coach);

        // Act + Assert
        assertAthleteForbidden(get(inProgressPath(leo.getId()), OTHER_ATHLETE_EMAIL), inProgressPath(leo.getId()));
        assertAthleteForbidden(get(inProgressPath(leo.getId()), OTHER_COACH_EMAIL), inProgressPath(leo.getId()));
    }

    @Test
    void shouldReturn404And401ForTheSessionInProgress() {
        UUID missing = UUID.randomUUID();

        assertEquals(HttpStatus.NOT_FOUND, get(inProgressPath(missing), COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, get(inProgressPath(leo.getId()), null).getStatusCode());
    }

    // ---------- detalle ----------

    @Test
    void shouldReturnTheSessionToTheAthleteAndItsCoach() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        String id = json(start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL)).get("id").asString();
        String path = sessionsPath(leo.getId()) + "/" + id;

        // Act
        ResponseEntity<String> own = get(path, ATHLETE_EMAIL);
        ResponseEntity<String> fromCoach = get(path, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, own.getStatusCode());
        assertEquals(id, json(own).get("id").asString());
        assertEquals(today().toString(), json(own).get("sessionDate").asString());
        assertEquals(List.of("Press banca", "Remo bajo"), exerciseNames(json(own).get("day")));
        assertEquals(HttpStatus.OK, fromCoach.getStatusCode());
        assertEquals(id, json(fromCoach).get("id").asString());
    }

    // El día se lee en vivo (D-020): si el entrenador lo renombra, la sesión muestra el nombre nuevo
    @Test
    void shouldShowTheDayAsItIsNow() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        String id = json(start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL)).get("id").asString();
        jdbcTemplate.update("update routine_days set name = 'Torso pesado' where id = ?", day(strength, 0).getId());

        // Act
        JsonNode body = json(get(sessionsPath(leo.getId()) + "/" + id, ATHLETE_EMAIL));

        // Assert
        assertEquals("Torso pesado", body.get("day").get("name").asString());
    }

    @Test
    void shouldReturn404WhenTheSessionDoesNotExistOrIsOfAnotherAthlete() {
        // Arrange: Mía, otra atleta de Ana, tiene una sesión
        Athlete mia = saveAthlete(OTHER_ATHLETE_EMAIL, coach);
        Routine strength = saveStrengthRoutine((short) 8);
        TrainingSession miaSession = trainingSessionRepository.saveAndFlush(
                session(assign(mia, strength, today()), day(strength, 0), today()));
        UUID missing = UUID.randomUUID();

        // Act
        ResponseEntity<String> foreign = get(sessionsPath(leo.getId()) + "/" + miaSession.getId(), ATHLETE_EMAIL);

        // Assert: la sesión de otra atleta pedida por la ruta de Leo, también para su entrenador
        assertEquals(HttpStatus.NOT_FOUND, foreign.getStatusCode());
        assertEquals("No existe la sesión de entrenamiento con id " + miaSession.getId(),
                json(foreign).get("message").asString());
        assertEquals(HttpStatus.NOT_FOUND,
                get(sessionsPath(leo.getId()) + "/" + miaSession.getId(), COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, get(sessionsPath(leo.getId()) + "/" + missing, ATHLETE_EMAIL)
                .getStatusCode());
    }

    @Test
    void shouldReturn403ForTheDetailToAnotherAthleteAndAnotherCoach() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        assign(leo, strength, today());
        String id = json(start(leo.getId(), day(strength, 0).getId(), ATHLETE_EMAIL)).get("id").asString();
        saveAthlete(OTHER_ATHLETE_EMAIL, coach);
        String path = sessionsPath(leo.getId()) + "/" + id;

        // Act + Assert
        assertAthleteForbidden(get(path, OTHER_ATHLETE_EMAIL), path);
        assertAthleteForbidden(get(path, OTHER_COACH_EMAIL), path);
    }

    @Test
    void shouldReturn400WhenAnIdIsNotAUuidAnd401WithoutToken() {
        assertEquals(HttpStatus.BAD_REQUEST,
                get(sessionsPath(leo.getId()) + "/no-es-un-uuid", ATHLETE_EMAIL).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, get("/api/athletes/no-es-un-uuid/sessions/in-progress", COACH_EMAIL)
                .getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                get(sessionsPath(leo.getId()) + "/" + UUID.randomUUID(), null).getStatusCode());
    }

    // ---------- helpers ----------

    // Torso (press con todos los parámetros y remo solo con los obligatorios) y Pierna (sentadilla).
    // Sin guardar, para poder agregarle días
    private Routine strengthRoutine(String name, Short durationWeeks) {
        Routine routine = routine(name, coach);
        routine.setDurationWeeks(durationWeeks);
        RoutineDay upper = routine.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(RoutineExercise.builder().exercise(row).sets((short) 3).reps((short) 12).build());
        routine.addDay("Pierna").addExercise(routineExercise(squat));
        return routine;
    }

    private Routine saveRoutine(String name, Short durationWeeks) {
        return routineRepository.saveAndFlush(strengthRoutine(name, durationWeeks));
    }

    private Routine saveStrengthRoutine(Short durationWeeks) {
        return saveRoutine("Fuerza", durationWeeks);
    }

    // Asignación activa con fecha fija (la API de US-16 siempre usa "hoy")
    private RoutineAssignment assign(Athlete athlete, Routine routine, LocalDate assignmentDate) {
        return routineAssignmentRepository.saveAndFlush(assignment(athlete, routine, assignmentDate));
    }

    private static RoutineDay day(Routine routine, int index) {
        return routine.getDays().get(index);
    }

    private ResponseEntity<String> start(UUID athleteId, UUID routineDayId, String email) {
        return exchange(HttpMethod.POST, sessionsPath(athleteId), startRequest(routineDayId), email);
    }

    private ResponseEntity<String> get(String uri, String email) {
        return exchange(HttpMethod.GET, uri, null, email);
    }

    private static String sessionsPath(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/sessions";
    }

    private static String inProgressPath(UUID athleteId) {
        return sessionsPath(athleteId) + "/in-progress";
    }

    // Request con la sesión de ese email (null = sin token). Un body String se manda tal cual; cualquier otro se
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

    // "Hoy" como lo calcula el backend (zona de la app)
    private LocalDate today() {
        return LocalDate.now(timeZoneProperties.zoneId());
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from training_sessions", Integer.class);
        return count == null ? 0 : count;
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private static List<String> exerciseNames(JsonNode day) {
        List<String> names = new ArrayList<>();
        day.get("exercises").forEach(exercise -> names.add(exercise.get("exerciseName").asString()));
        return names;
    }

    private void assertUnprocessable(ResponseEntity<String> response, String message) {
        assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, response.getStatusCode());
        assertEquals(message, json(response).get("message").asString());
        assertEquals(0, count());
    }

    private void assertAthleteForbidden(ResponseEntity<String> response, String path) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertEquals(path, body.get("path").asString());
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }
}
