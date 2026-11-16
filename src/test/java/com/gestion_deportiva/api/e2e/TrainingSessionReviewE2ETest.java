package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import com.gestion_deportiva.api.assignment.repository.RoutineAssignmentRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.model.RoutineDay;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotReviewableException;
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
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignment;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineExercise;
import static com.gestion_deportiva.api.support.TrainingSessionFixtures.middayInArgentina;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Revisión del entrenador (US-21, contrato 15.4 y 15.6): solo el entrenador del atleta, solo sesiones finalizadas, la
// observación recortada y de hasta 1000 caracteres, y revisar de nuevo reemplaza. Las sesiones se crean en la base y
// la revisión va por HTTP
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class TrainingSessionReviewE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final LocalDate NOV_11 = LocalDate.of(2026, 11, 11);

    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";
    private static final String ATHLETE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este atleta";
    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";

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

    private RestClient client;

    private Athlete leo;

    private Athlete mia;

    private RoutineAssignment leoAssignment;

    private RoutineAssignment miaAssignment;

    private RoutineDay upper;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        Coach ana = coachRepository.saveAndFlush(new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        coachRepository.saveAndFlush(new Coach("Bruno", "Gil", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
        mia = athleteRepository.saveAndFlush(
                new Athlete("Mia", "Ruiz", OTHER_ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
        // Ejercicios propios de Ana: no chocan con los globales precargados por la V3
        Exercise bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, ana));
        Exercise squat = exerciseRepository.saveAndFlush(exercise("Sentadilla", MuscleGroup.QUADRICEPS, ana));
        Routine strength = routine("Fuerza", ana);
        upper = strength.addDay("Torso");
        upper.addExercise(routineExercise(bench));
        strength.addDay("Pierna").addExercise(routineExercise(squat));
        strength = routineRepository.saveAndFlush(strength);
        leoAssignment = routineAssignmentRepository.saveAndFlush(assignment(leo, strength, NOV_11));
        miaAssignment = routineAssignmentRepository.saveAndFlush(assignment(mia, strength, NOV_11));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- revisar: 200 ----------

    @Test
    void shouldReviewAFinishedSessionWithTheTrimmedObservationAndShowItToTheAthlete() {
        // Arrange
        TrainingSession session = finished(leoAssignment, upper);
        Instant before = Instant.now().minusSeconds(1);

        // Act
        ResponseEntity<String> response = review(reviewPath(leo, session), "{\"observation\": \"  Buen trabajo  \"}",
                COACH_EMAIL);

        // Assert: 200 con la sesión y su revisión; la base la guardó recortada
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("FINISHED", body.get("status").asString());
        assertEquals("Buen trabajo", body.get("review").get("observation").asString());
        Instant reviewedAt = Instant.parse(body.get("review").get("reviewedAt").asString());
        assertFalse(reviewedAt.isBefore(before));
        assertFalse(reviewedAt.isAfter(Instant.now()));
        assertEquals("Buen trabajo", observationOf(session.getId()));

        // Assert: el atleta ve la revisión en el detalle de la sesión
        JsonNode detail = json(get(sessionPath(leo, session), ATHLETE_EMAIL));
        assertEquals("Buen trabajo", detail.get("review").get("observation").asString());
    }

    @Test
    void shouldReviewWithoutObservationWhenTheBodyIsEmptyOrBlank() {
        TrainingSession withoutBody = finished(leoAssignment, upper);
        TrainingSession blank = finished(leoAssignment, upper);

        // Act: sin observación, o solo espacios
        JsonNode empty = json(review(reviewPath(leo, withoutBody), "{}", COACH_EMAIL));
        JsonNode spaces = json(review(reviewPath(leo, blank), "{\"observation\": \"   \"}", COACH_EMAIL));

        // Assert: revisada, con observación null
        assertNotNull(empty.get("review"));
        assertTrue(empty.get("review").get("observation").isNull());
        assertTrue(spaces.get("review").get("observation").isNull());
        assertTrue(isReviewed(withoutBody.getId()));
    }

    @Test
    void shouldReplaceTheObservationWhenReviewedAgain() {
        TrainingSession session = finished(leoAssignment, upper);
        assertEquals(HttpStatus.OK, review(reviewPath(leo, session), "{\"observation\": \"Primera\"}",
                COACH_EMAIL).getStatusCode());

        // Act
        ResponseEntity<String> again = review(reviewPath(leo, session), "{\"observation\": \"Segunda\"}", COACH_EMAIL);

        // Assert: la observación es la nueva; la sesión sigue con una sola revisión (son columnas de la sesión)
        assertEquals(HttpStatus.OK, again.getStatusCode());
        assertEquals("Segunda", json(again).get("review").get("observation").asString());
        assertEquals("Segunda", observationOf(session.getId()));
    }

    @Test
    void shouldAcceptAnObservationOfExactlyAThousandCharacters() {
        TrainingSession session = finished(leoAssignment, upper);
        String text = "a".repeat(1000);

        ResponseEntity<String> response = review(reviewPath(leo, session),
                jsonMapper.writeValueAsString(Map.of("observation", text)), COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(text, json(response).get("review").get("observation").asString());
    }

    // ---------- errores de validación y de estado ----------

    @Test
    void shouldReturn400WhenTheObservationExceeds1000CharactersAndLeaveTheSessionUnreviewed() {
        TrainingSession session = finished(leoAssignment, upper);

        ResponseEntity<String> response = review(reviewPath(leo, session),
                jsonMapper.writeValueAsString(Map.of("observation", "a".repeat(1001))), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        assertEquals("observation", body.get("fieldErrors").get(0).get("field").asString());
        assertEquals("La observación no puede superar los 1000 caracteres",
                body.get("fieldErrors").get(0).get("message").asString());
        assertFalse(isReviewed(session.getId()));
    }

    @Test
    void shouldReturn422WhenTheSessionIsInProgressOrCancelled() {
        TrainingSession inProgress = trainingSessionRepository.saveAndFlush(
                TrainingSession.start(leoAssignment, upper, middayInArgentina(NOV_11), NOV_11));
        TrainingSession cancelled = TrainingSession.start(leoAssignment, upper, middayInArgentina(NOV_11), NOV_11);
        cancelled.cancel(middayInArgentina(NOV_11).plusSeconds(600));
        trainingSessionRepository.saveAndFlush(cancelled);

        // Act + Assert: 422 con el mensaje de la regla; ninguna queda revisada
        for (TrainingSession session : new TrainingSession[] {inProgress, cancelled}) {
            ResponseEntity<String> response = review(reviewPath(leo, session), "{\"observation\": \"Hola\"}",
                    COACH_EMAIL);
            assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, response.getStatusCode());
            assertEquals(TrainingSessionNotReviewableException.MESSAGE, json(response).get("message").asString());
            assertFalse(isReviewed(session.getId()));
        }
    }

    // ---------- rol y pertenencia ----------

    @Test
    void shouldReturn403ForTheAthleteEvenOnHisOwnSession() {
        TrainingSession session = finished(leoAssignment, upper);

        ResponseEntity<String> response = review(reviewPath(leo, session), "{\"observation\": \"Mía\"}",
                ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        assertFalse(isReviewed(session.getId()));
    }

    @Test
    void shouldReturn403ForACoachWhoDoesNotCoachTheAthlete() {
        TrainingSession session = finished(leoAssignment, upper);

        ResponseEntity<String> response = review(reviewPath(leo, session), "{}", OTHER_COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ATHLETE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        assertFalse(isReviewed(session.getId()));
    }

    @Test
    void shouldReturn404WhenTheSessionBelongsToAnotherAthlete() {
        // La sesión es de Mía; se pide por la ruta de Leo, del mismo entrenador
        TrainingSession miasSession = finished(miaAssignment, upper);

        ResponseEntity<String> response = review(reviewPath(leo, miasSession), "{}", COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe la sesión de entrenamiento con id " + miasSession.getId(),
                json(response).get("message").asString());
        assertFalse(isReviewed(miasSession.getId()));
    }

    @Test
    void shouldReturn404WhenTheSessionDoesNotExist() {
        String unknown = athleteSessionsPath(leo) + "/" + UUID.randomUUID() + "/review";

        assertEquals(HttpStatus.NOT_FOUND, review(unknown, "{}", COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturn401WithoutToken() {
        TrainingSession session = finished(leoAssignment, upper);

        ResponseEntity<String> response = review(reviewPath(leo, session), "{}", null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
        assertFalse(isReviewed(session.getId()));
    }

    // ---------- helpers ----------

    // Sesión de Leo o de Mía finalizada 45 minutos después del inicio, guardada en la base
    private TrainingSession finished(RoutineAssignment assignment, RoutineDay day) {
        TrainingSession session = TrainingSession.start(assignment, day, middayInArgentina(NOV_11), NOV_11);
        session.finish(middayInArgentina(NOV_11).plus(45, ChronoUnit.MINUTES));
        return trainingSessionRepository.saveAndFlush(session);
    }

    private static String athleteSessionsPath(Athlete athlete) {
        return "/api/athletes/" + athlete.getId() + "/sessions";
    }

    private static String sessionPath(Athlete athlete, TrainingSession session) {
        return athleteSessionsPath(athlete) + "/" + session.getId();
    }

    private static String reviewPath(Athlete athlete, TrainingSession session) {
        return sessionPath(athlete, session) + "/review";
    }

    private ResponseEntity<String> review(String uri, String rawBody, String email) {
        return exchange(HttpMethod.PUT, uri, rawBody, email);
    }

    private ResponseEntity<String> get(String uri, String email) {
        return exchange(HttpMethod.GET, uri, null, email);
    }

    // Request con la sesión de ese email (null = sin token). Un body se manda como JSON; los 4xx no lanzan excepción
    private ResponseEntity<String> exchange(HttpMethod method, String uri, String rawBody, String email) {
        RestClient.RequestBodySpec request = client.method(method)
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    }
                });
        if (rawBody != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).body(rawBody);
        }
        return request.retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private String observationOf(UUID sessionId) {
        return jdbcTemplate.queryForObject(
                "select coach_observation from training_sessions where id = ?", String.class, sessionId);
    }

    private boolean isReviewed(UUID sessionId) {
        Boolean reviewed = jdbcTemplate.queryForObject(
                "select reviewed_at is not null from training_sessions where id = ?", Boolean.class, sessionId);
        return Boolean.TRUE.equals(reviewed);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }
}
