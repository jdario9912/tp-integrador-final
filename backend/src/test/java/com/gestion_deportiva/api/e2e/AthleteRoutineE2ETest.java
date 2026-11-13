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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Rutina activa del atleta (US-17, contrato 9): estructura, vigencia y día que toca; 204 sin rutina activa; y la
// pertenencia (el atleta, solo la suya; el entrenador, solo la de sus atletas vinculados)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class AthleteRoutineE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

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
    private ExerciseRepository exerciseRepository;

    @Autowired
    private RoutineRepository routineRepository;

    @Autowired
    private RoutineAssignmentRepository routineAssignmentRepository;

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
    // exercises, routines (con sus días y ejercicios) y routine_assignments
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- 200: rutina activa ----------

    @Test
    void shouldReturn200WithTheActiveRoutineItsValidityAndTheNextDay() {
        // Arrange
        Routine strength = saveStrengthRoutine((short) 8);
        RoutineAssignment active = assign(strength, today());

        // Act
        ResponseEntity<String> response = get(leo.getId(), ATHLETE_EMAIL);

        // Assert: asignación, vigencia y día que toca (por ahora, el primero)
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(active.getId().toString(), body.get("assignmentId").asString());
        assertEquals(today().toString(), body.get("assignmentDate").asString());
        assertEquals(today().plusWeeks(8).minusDays(1).toString(), body.get("endDate").asString());
        assertFalse(body.get("expired").asBoolean());
        assertEquals(day(strength, 0).getId().toString(), body.get("nextDayId").asString());
        assertFalse(body.has("athleteId"));
        assertFalse(body.has("active"));

        // Assert: rutina, sin los datos de gestión del entrenador
        JsonNode routine = body.get("routine");
        assertEquals(strength.getId().toString(), routine.get("id").asString());
        assertEquals("Fuerza", routine.get("name").asString());
        assertEquals("Bloque de fuerza", routine.get("description").asString());
        assertEquals("Fuerza", routine.get("goal").asString());
        assertEquals(2, routine.get("daysPerWeek").asInt());
        assertEquals(8, routine.get("durationWeeks").asInt());
        assertFalse(routine.has("isTemplate"));
        assertFalse(routine.has("createdAt"));

        // Assert: días por dayNumber y ejercicios por sortOrder
        JsonNode days = routine.get("days");
        assertEquals(List.of("Torso", "Pierna"), names(days));
        assertEquals(day(strength, 0).getId().toString(), days.get(0).get("id").asString());
        assertEquals(1, days.get(0).get("dayNumber").asInt());
        assertEquals(2, days.get(1).get("dayNumber").asInt());
        assertEquals(List.of("Press banca", "Remo bajo"), exerciseNames(days.get(0)));
        assertEquals(List.of("Sentadilla"), exerciseNames(days.get(1)));

        JsonNode press = days.get(0).get("exercises").get(0);
        assertEquals(bench.getId().toString(), press.get("exerciseId").asString());
        assertEquals("CHEST", press.get("muscleGroup").asString());
        assertEquals(0, press.get("sortOrder").asInt());
        assertEquals(4, press.get("sets").asInt());
        assertEquals(10, press.get("reps").asInt());
        assertEquals(60.5, press.get("recommendedWeight").asDouble());
        assertEquals(90, press.get("rest").asInt());
        assertEquals("RIR 2", press.get("rirRpe").asString());
        assertEquals("Bajar en 3 segundos", press.get("techniqueNote").asString());

        // Assert: los opcionales sin cargar vienen en null
        JsonNode rowing = days.get(0).get("exercises").get(1);
        assertEquals(1, rowing.get("sortOrder").asInt());
        assertTrue(rowing.get("recommendedWeight").isNull());
        assertTrue(rowing.get("rest").isNull());
        assertTrue(rowing.get("rirRpe").isNull());
        assertTrue(rowing.get("techniqueNote").isNull());
    }

    @Test
    void shouldReturnTheRoutineToTheCoachOfTheAthlete() {
        RoutineAssignment active = assign(saveStrengthRoutine((short) 8), today());

        ResponseEntity<String> response = get(leo.getId(), COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(active.getId().toString(), json(response).get("assignmentId").asString());
    }

    @Test
    void shouldReturnTheRoutineOfADeactivatedAthleteToItsCoach() {
        assign(saveStrengthRoutine((short) 8), today());
        leo.deactivate();
        athleteRepository.saveAndFlush(leo);

        assertEquals(HttpStatus.OK, get(leo.getId(), COACH_EMAIL).getStatusCode());
    }

    // ---------- vigencia ----------

    @Test
    void shouldBeExpiredFromTheDayAfterItsLastDayAndStillReturnTheRoutine() {
        // Arrange: 1 semana desde hace 7 días → el último día vigente fue ayer
        assign(saveStrengthRoutine((short) 1), today().minusWeeks(1));

        // Act
        JsonNode body = json(get(leo.getId(), ATHLETE_EMAIL));

        // Assert: 200 con la rutina completa y el aviso
        assertEquals(today().minusDays(1).toString(), body.get("endDate").asString());
        assertTrue(body.get("expired").asBoolean());
        assertEquals(2, body.get("routine").get("days").size());
        assertFalse(body.get("nextDayId").isNull());
    }

    @Test
    void shouldStillBeValidOnItsLastDay() {
        // Arrange: 1 semana desde hace 6 días → hoy es el último día vigente
        assign(saveStrengthRoutine((short) 1), today().minusDays(6));

        // Act
        JsonNode body = json(get(leo.getId(), ATHLETE_EMAIL));

        // Assert
        assertEquals(today().toString(), body.get("endDate").asString());
        assertFalse(body.get("expired").asBoolean());
    }

    @Test
    void shouldNeverExpireWithoutDuration() {
        assign(saveStrengthRoutine(null), today().minusYears(1));

        JsonNode body = json(get(leo.getId(), ATHLETE_EMAIL));

        assertTrue(body.get("endDate").isNull());
        assertFalse(body.get("expired").asBoolean());
        assertTrue(body.get("routine").get("durationWeeks").isNull());
    }

    // ---------- estructura incompleta (la regla de "completa" solo se exige al asignar) ----------

    @Test
    void shouldReturnNoDaysAndNoNextDayWhenTheRoutineWasEmptiedAfterAssigningIt() {
        // Arrange: el entrenador le quita todos los días (ON DELETE CASCADE borra sus ejercicios)
        Routine strength = saveStrengthRoutine((short) 8);
        assign(strength, today());
        jdbcTemplate.update("delete from routine_days where routine_id = ?", strength.getId());

        // Act
        ResponseEntity<String> response = get(leo.getId(), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertTrue(body.get("routine").get("days").isEmpty());
        assertTrue(body.get("nextDayId").isNull());
    }

    @Test
    void shouldReturnADayWithoutExercisesWithAnEmptyList() {
        // Arrange: Torso, Pierna y Movilidad (sin ejercicios)
        Routine strength = strengthRoutine((short) 8);
        strength.addDay("Movilidad");
        strength = routineRepository.saveAndFlush(strength);
        assign(strength, today());

        // Act
        JsonNode days = json(get(leo.getId(), ATHLETE_EMAIL)).get("routine").get("days");

        // Assert
        assertEquals(List.of("Torso", "Pierna", "Movilidad"), names(days));
        assertTrue(days.get(2).get("exercises").isEmpty());
    }

    // ---------- 204: sin rutina activa ----------

    @Test
    void shouldReturn204WithoutBodyWhenTheAthleteHasNoRoutine() {
        ResponseEntity<String> response = get(leo.getId(), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertTrue(response.getBody() == null || response.getBody().isEmpty());
    }

    @Test
    void shouldReturn204WhenTheAthleteOnlyHasInactiveAssignments() {
        // Arrange: una asignación que quedó en el historial
        RoutineAssignment previous = assignment(leo, saveStrengthRoutine((short) 8), today().minusMonths(3));
        previous.deactivate();
        routineAssignmentRepository.saveAndFlush(previous);

        // Act + Assert: también para su entrenador
        assertEquals(HttpStatus.NO_CONTENT, get(leo.getId(), ATHLETE_EMAIL).getStatusCode());
        assertEquals(HttpStatus.NO_CONTENT, get(leo.getId(), COACH_EMAIL).getStatusCode());
    }

    // ---------- pertenencia ----------

    @Test
    void shouldReturn403ToAnotherAthleteBeforeRevealingWhetherThereIsARoutine() {
        // Arrange: Leo no tiene rutina; si el 204 se evaluara antes de la pertenencia, Mía se enteraría
        saveAthlete(OTHER_ATHLETE_EMAIL, coach);

        // Act + Assert
        assertAthleteForbidden(get(leo.getId(), OTHER_ATHLETE_EMAIL), leo);
    }

    @Test
    void shouldReturn403ToTheCoachOfAnotherAthlete() {
        assign(saveStrengthRoutine((short) 8), today());

        assertAthleteForbidden(get(leo.getId(), OTHER_COACH_EMAIL), leo);
    }

    @Test
    void shouldLetAnUnlinkedAthleteSeeItsRoutineButNotItsFormerCoach() {
        // Arrange: la desvinculación (US-07) no toca la asignación activa (D-018)
        RoutineAssignment active = assign(saveStrengthRoutine((short) 8), today());
        leo.unassignCoach();
        athleteRepository.saveAndFlush(leo);

        // Act
        ResponseEntity<String> own = get(leo.getId(), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, own.getStatusCode());
        assertEquals(active.getId().toString(), json(own).get("assignmentId").asString());
        assertAthleteForbidden(get(leo.getId(), COACH_EMAIL), leo);
    }

    // ---------- 404, 401 y 400 ----------

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = get(missing, COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
    }

    @Test
    void shouldReturn404ToADeletedAthleteWithItsStillValidToken() {
        // Arrange: el access token sigue vigente después de la baja lógica (máximo 15 min, contrato 1.2)
        assign(saveStrengthRoutine((short) 8), today());
        String token = accessToken(ATHLETE_EMAIL);
        jdbcTemplate.update("update users set deleted_at = now() where id = ?", leo.getId());

        // Act + Assert
        assertEquals(HttpStatus.NOT_FOUND, exchange(path(leo.getId()), null, token).getStatusCode());
    }

    @Test
    void shouldReturn401WithoutToken() {
        assign(saveStrengthRoutine((short) 8), today());

        ResponseEntity<String> response = get(leo.getId(), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn400WhenTheAthleteIdIsNotAUuid() {
        ResponseEntity<String> response = exchange("/api/athletes/no-es-un-uuid/routine", COACH_EMAIL, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // ---------- helpers ----------

    // Fuerza: Torso (press con todos los parámetros y remo solo con los obligatorios) y Pierna (sentadilla).
    // Sin guardar, para poder agregarle días
    private Routine strengthRoutine(Short durationWeeks) {
        Routine strength = routine("Fuerza", coach);
        strength.setDescription("Bloque de fuerza");
        strength.setGoal("Fuerza");
        strength.setDaysPerWeek((short) 2);
        strength.setDurationWeeks(durationWeeks);
        RoutineDay upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        upper.addExercise(RoutineExercise.builder().exercise(row).sets((short) 3).reps((short) 12).build());
        strength.addDay("Pierna").addExercise(routineExercise(squat));
        return strength;
    }

    private Routine saveStrengthRoutine(Short durationWeeks) {
        return routineRepository.saveAndFlush(strengthRoutine(durationWeeks));
    }

    // Asignación activa de Leo con fecha fija (la API de US-16 siempre usa "hoy")
    private RoutineAssignment assign(Routine routine, LocalDate assignmentDate) {
        return routineAssignmentRepository.saveAndFlush(assignment(leo, routine, assignmentDate));
    }

    private static RoutineDay day(Routine routine, int index) {
        return routine.getDays().get(index);
    }

    private ResponseEntity<String> get(UUID athleteId, String email) {
        return exchange(path(athleteId), email, null);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/routine";
    }

    // GET con la sesión de ese email, o con un token fijo (ambos null = sin token)
    private ResponseEntity<String> exchange(String uri, String email, String token) {
        return client.get()
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    } else if (token != null) {
                        headers.setBearerAuth(token);
                    }
                })
                .retrieve()
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

    private static List<String> names(JsonNode days) {
        List<String> names = new ArrayList<>();
        days.forEach(day -> names.add(day.get("name").asString()));
        return names;
    }

    private static List<String> exerciseNames(JsonNode day) {
        List<String> names = new ArrayList<>();
        day.get("exercises").forEach(exercise -> names.add(exercise.get("exerciseName").asString()));
        return names;
    }

    private void assertAthleteForbidden(ResponseEntity<String> response, Athlete requested) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertEquals(path(requested.getId()), body.get("path").asString());
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }
}
