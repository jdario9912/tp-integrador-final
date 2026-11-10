package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.assignment.exception.AthleteNotAssignableException;
import com.gestion_deportiva.api.assignment.exception.IncompleteRoutineException;
import com.gestion_deportiva.api.assignment.exception.RoutineAlreadyActiveException;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.repository.ExerciseRepository;
import com.gestion_deportiva.api.routine.exception.RoutineAccessDeniedException;
import com.gestion_deportiva.api.routine.model.Routine;
import com.gestion_deportiva.api.routine.repository.RoutineRepository;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.AssignmentFixtures.assignRequest;
import static com.gestion_deportiva.api.support.AssignmentFixtures.completeRoutine;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exercise;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Asignación de rutinas (US-16): alta con confirmación de reemplazo e historial, con la pertenencia del atleta y de
// la rutina y las reglas de negocio (atleta asignable, rutina completa)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class RoutineAssignmentE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";

    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
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
    private RoutineRepository routineRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private TimeZoneProperties timeZoneProperties;

    private RestClient client;

    private Coach coach;

    private Coach otherCoach;

    // Atleta de Ana
    private Athlete leo;

    private Exercise bench;

    // Rutinas completas de Ana
    private Routine strength;

    private Routine hypertrophy;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = saveCoach(COACH_EMAIL);
        otherCoach = saveCoach(OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, coach);
        bench = exerciseRepository.saveAndFlush(exercise("Press banca", MuscleGroup.CHEST, null));
        strength = routineRepository.saveAndFlush(completeRoutine("Fuerza", coach, bench));
        hypertrophy = routineRepository.saveAndFlush(completeRoutine("Hipertrofia", coach, bench));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también athletes,
    // routines, exercises y routine_assignments
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- POST /api/athletes/{athleteId}/assignments ----------

    @Test
    void shouldReturn201WithTheActiveAssignmentAndPersistIt() {
        // Act
        ResponseEntity<String> response = post(leo.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertEquals(strength.getId().toString(), body.get("routineId").asString());
        assertEquals("Fuerza", body.get("routineName").asString());
        assertEquals(today().toString(), body.get("assignmentDate").asString());
        assertTrue(body.get("active").asBoolean());
        assertFalse(body.has("athleteId"));

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap("select athlete_id::text as athlete_id,"
                + " routine_id::text as routine_id, assignment_date, active from routine_assignments"
                + " where id = ?::uuid", id);
        assertEquals(leo.getId().toString(), row.get("athlete_id"));
        assertEquals(strength.getId().toString(), row.get("routine_id"));
        assertEquals(today(), ((java.sql.Date) row.get("assignment_date")).toLocalDate());
        assertEquals(true, row.get("active"));
    }

    @Test
    void shouldAskForConfirmationAndReplaceTheActiveRoutineOnRetry() {
        // Arrange
        post(leo.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        // Act: sin confirmar
        ResponseEntity<String> conflict = post(leo.getId(), assignRequest(hypertrophy.getId(), false), COACH_EMAIL);

        // Assert: 409 que nombra la activa, sin cambios
        assertEquals(HttpStatus.CONFLICT, conflict.getStatusCode());
        assertTrue(json(conflict).get("message").asString().contains("«Fuerza»"));
        assertEquals(1, count());

        // Act: con confirmación
        ResponseEntity<String> replaced = post(leo.getId(), assignRequest(hypertrophy.getId(), true), COACH_EMAIL);

        // Assert: la nueva queda activa y la anterior inactiva
        assertEquals(HttpStatus.CREATED, replaced.getStatusCode());
        assertEquals("Hipertrofia", json(replaced).get("routineName").asString());
        assertEquals(2, count());
        assertEquals(1, countActive());
        assertEquals(Boolean.FALSE, jdbcTemplate.queryForObject(
                "select active from routine_assignments where routine_id = ?", Boolean.class, strength.getId()));
    }

    @Test
    void shouldReturn422WhenTheRoutineIsAlreadyTheActiveOne() {
        post(leo.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        ResponseEntity<String> response = post(leo.getId(), assignRequest(strength.getId(), true), COACH_EMAIL);

        assertBusinessRule(response, RoutineAlreadyActiveException.MESSAGE);
        assertEquals(1, count());
        assertEquals(1, countActive());
    }

    @Test
    void shouldAssignATemplateRoutine() {
        strength.setTemplate(true);
        routineRepository.saveAndFlush(strength);

        ResponseEntity<String> response = post(leo.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    void shouldReturn400WhenTheRoutineIsMissing() {
        ResponseEntity<String> response = post(leo.getId(), "{}", COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(response).get("message").asString());
        assertEquals(Set.of("routineId"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        ResponseEntity<String> response = post(UUID.randomUUID(), assignRequest(strength.getId(), null),
                COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn404WhenTheRoutineDoesNotExist() {
        ResponseEntity<String> response = post(leo.getId(), assignRequest(UUID.randomUUID(), null), COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn403WhenTheAthleteBelongsToAnotherCoach() {
        Athlete mia = saveAthlete("mia@test.com", otherCoach);

        ResponseEntity<String> response = post(mia.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn403WhenTheRoutineBelongsToAnotherCoach() {
        Routine foreign = routineRepository.saveAndFlush(completeRoutine("Ajena", otherCoach, bench));

        ResponseEntity<String> response = post(leo.getId(), assignRequest(foreign.getId(), null), COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(RoutineAccessDeniedException.NOT_OWNER_MESSAGE, json(response).get("message").asString());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn422WhenTheAthleteIsDeactivated() {
        leo.deactivate();
        athleteRepository.saveAndFlush(leo);

        ResponseEntity<String> response = post(leo.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        assertBusinessRule(response, AthleteNotAssignableException.INACTIVE_MESSAGE);
        assertEquals(0, count());
    }

    @Test
    void shouldReturn422WhenTheAthleteIsUnlinked() {
        leo.unassignCoach();
        athleteRepository.saveAndFlush(leo);

        ResponseEntity<String> response = post(leo.getId(), assignRequest(strength.getId(), null), COACH_EMAIL);

        assertBusinessRule(response, AthleteNotAssignableException.UNLINKED_MESSAGE);
        assertEquals(0, count());
    }

    @Test
    void shouldReturn422WhenTheRoutineHasNoDays() {
        Routine empty = routineRepository.saveAndFlush(routine("Vacía", coach));

        ResponseEntity<String> response = post(leo.getId(), assignRequest(empty.getId(), null), COACH_EMAIL);

        assertBusinessRule(response, IncompleteRoutineException.MESSAGE);
        assertEquals(0, count());
    }

    @Test
    void shouldReturn422WhenADayHasNoExercises() {
        Routine partial = completeRoutine("Parcial", coach, bench);
        partial.addDay("Tirón");
        routineRepository.saveAndFlush(partial);

        ResponseEntity<String> response = post(leo.getId(), assignRequest(partial.getId(), null), COACH_EMAIL);

        assertBusinessRule(response, IncompleteRoutineException.MESSAGE);
        assertEquals(0, count());
    }

    @Test
    void shouldReturn401WhenAssigningWithoutToken() {
        assertUnauthorized(post(leo.getId(), assignRequest(strength.getId(), null), null));
    }

    // ---------- GET /api/athletes/{athleteId}/assignments ----------

    @Test
    void shouldListTheHistoryWithTheActiveOneFirstThenNewestFirst() {
        // Arrange: Fuerza (inactiva, más vieja), Hipertrofia (inactiva, más reciente) y Base (activa, la más vieja)
        Routine base = routineRepository.saveAndFlush(completeRoutine("Base", coach, bench));
        insertAssignment(strength, LocalDate.of(2026, 1, 10), false);
        insertAssignment(hypertrophy, LocalDate.of(2026, 3, 10), false);
        insertAssignment(base, LocalDate.of(2026, 1, 1), true);

        // Act
        ResponseEntity<String> response = list(leo.getId(), "", COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode page = json(response);
        assertEquals(List.of("Base", "Hipertrofia", "Fuerza"), routineNames(page));
        assertTrue(page.get("content").get(0).get("active").asBoolean());
        assertFalse(page.get("content").get(1).get("active").asBoolean());
        assertEquals(3, page.get("totalElements").asInt());
    }

    @Test
    void shouldPaginateTheHistory() {
        insertAssignment(strength, LocalDate.of(2026, 1, 10), false);
        insertAssignment(hypertrophy, LocalDate.of(2026, 3, 10), true);

        ResponseEntity<String> response = list(leo.getId(), "?page=1&size=1", COACH_EMAIL);

        JsonNode page = json(response);
        assertEquals(List.of("Fuerza"), routineNames(page));
        assertEquals(2, page.get("totalElements").asInt());
        assertEquals(2, page.get("totalPages").asInt());
    }

    @Test
    void shouldReturnAnEmptyHistory() {
        JsonNode page = json(list(leo.getId(), "", COACH_EMAIL));

        assertTrue(page.get("content").isEmpty());
        assertEquals(0, page.get("totalElements").asInt());
    }

    @Test
    void shouldReturn403WhenListingTheHistoryOfAnotherCoachsAthlete() {
        Athlete mia = saveAthlete("mia@test.com", otherCoach);

        ResponseEntity<String> response = list(mia.getId(), "", COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn404WhenListingTheHistoryOfAMissingAthlete() {
        assertEquals(HttpStatus.NOT_FOUND, list(UUID.randomUUID(), "", COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturn401WhenListingWithoutToken() {
        assertUnauthorized(list(leo.getId(), "", null));
    }

    // ---------- helpers ----------

    private ResponseEntity<String> post(UUID athleteId, Object body, String email) {
        return exchange(HttpMethod.POST, path(athleteId), body, email);
    }

    private ResponseEntity<String> list(UUID athleteId, String query, String email) {
        return exchange(HttpMethod.GET, path(athleteId) + query, null, email);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/assignments";
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

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private Set<String> fieldErrors(ResponseEntity<String> response) {
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        return fields;
    }

    private static List<String> routineNames(JsonNode page) {
        List<String> names = new ArrayList<>();
        page.get("content").forEach(assignment -> names.add(assignment.get("routineName").asString()));
        return names;
    }

    private void assertBusinessRule(ResponseEntity<String> response, String message) {
        assertEquals(HttpStatus.UNPROCESSABLE_CONTENT, response.getStatusCode());
        assertEquals(message, json(response).get("message").asString());
    }

    private void assertUnauthorized(ResponseEntity<String> response) {
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }

    // Asignación con fecha fija (la API siempre usa "hoy")
    private void insertAssignment(Routine routine, LocalDate date, boolean active) {
        jdbcTemplate.update("insert into routine_assignments (athlete_id, routine_id, assignment_date, active)"
                + " values (?, ?, ?, ?)", leo.getId(), routine.getId(), date, active);
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from routine_assignments", Integer.class);
        return count == null ? 0 : count;
    }

    private int countActive() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from routine_assignments where active",
                Integer.class);
        return count == null ? 0 : count;
    }
}
