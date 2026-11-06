package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.RoutineFixtures.routine;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Rutinas del entrenador (US-13): alta, "mis rutinas" y detalle
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class RoutineE2ETest {

    private static final String PATH = "/api/routines";
    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";

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

    private RestClient client;

    private Coach coach;

    private Coach otherCoach;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        otherCoach = coachRepository.saveAndFlush(
                new Coach("Bruno", "Sosa", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también routines
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- alta ----------

    @Test
    void shouldReturn201WithTheRoutineAndPersistItOwnedByTheCoach() {
        // Arrange
        RoutineRequest request = routineRequest("Fuerza 4 días");

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", request, COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + id));
        assertEquals("Fuerza 4 días", body.get("name").asString());
        assertEquals(request.description(), body.get("description").asString());
        assertEquals(request.goal(), body.get("goal").asString());
        assertEquals(4, body.get("daysPerWeek").asInt());
        assertEquals(8, body.get("durationWeeks").asInt());
        assertTrue(body.get("isTemplate").asBoolean());
        assertFalse(body.get("createdAt").isNull());

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select coach_id::text as coach_id, is_template from routines where id = ?::uuid", id);
        assertEquals(coach.getId().toString(), row.get("coach_id"));
        assertEquals(true, row.get("is_template"));
    }

    @Test
    void shouldReturn201WithOnlyRequiredFieldsAndNotATemplate() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                routineRequestWithOnlyRequired("Fuerza"), COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        assertFalse(body.get("isTemplate").asBoolean());
        assertTrue(body.get("description").isNull());
        assertTrue(body.get("goal").isNull());
        assertTrue(body.get("daysPerWeek").isNull());
        assertTrue(body.get("durationWeeks").isNull());
    }

    @Test
    void shouldReturn400WithTheInvalidFields() {
        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                new RoutineRequest(" ", "d".repeat(501), null, (short) 8, (short) 0, null), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name", "description", "daysPerWeek", "durationWeeks"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn400WhenTheNameIsTooLong() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                routineRequestWithOnlyRequired("a".repeat(101)), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name"), fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn409WhenTheCoachAlreadyHasThatNameIgnoringCase() {
        // Arrange
        routineRepository.saveAndFlush(routine("Fuerza 4 días", coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                routineRequest(" FUERZA 4 DÍAS "), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(json(response).get("message").asString().contains("FUERZA 4 DÍAS"));
        assertEquals(1, count());
    }

    @Test
    void shouldAllowANameUsedByAnotherCoach() {
        routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        ResponseEntity<String> response = exchange(HttpMethod.POST, "", routineRequest("Fuerza"), COACH_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(2, count());
    }

    @Test
    void shouldReturn403WhenAnAthleteCreatesARoutine() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", routineRequest("Fuerza"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(0, count());
    }

    @Test
    void shouldReturn401WithoutToken() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", routineRequest("Fuerza"), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(0, count());
    }

    // ---------- listado ----------

    @Test
    void shouldListOnlyTheCoachsRoutinesSortedByName() {
        // Arrange
        routineRepository.saveAndFlush(routine("Hipertrofia", coach));
        routineRepository.saveAndFlush(routine("Fuerza", coach));
        routineRepository.saveAndFlush(routine("Ajena", otherCoach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.GET, "", null, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode page = json(response);
        assertEquals(List.of("Fuerza", "Hipertrofia"), names(page));
        assertEquals(2, page.get("totalElements").asInt());
    }

    @Test
    void shouldPaginateIgnoringTheClientSort() {
        // Arrange
        routineRepository.saveAndFlush(routine("C", coach));
        routineRepository.saveAndFlush(routine("A", coach));
        routineRepository.saveAndFlush(routine("B", coach));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.GET, "?page=1&size=2&sort=name,desc", null,
                COACH_EMAIL);

        // Assert
        JsonNode page = json(response);
        assertEquals(List.of("C"), names(page));
        assertEquals(3, page.get("totalElements").asInt());
        assertEquals(2, page.get("totalPages").asInt());
    }

    @Test
    void shouldReturnAnEmptyPageWhenTheCoachHasNoRoutines() {
        routineRepository.saveAndFlush(routine("Ajena", otherCoach));

        JsonNode page = json(exchange(HttpMethod.GET, "", null, COACH_EMAIL));

        assertTrue(names(page).isEmpty());
        assertEquals(0, page.get("totalElements").asInt());
    }

    // ---------- detalle ----------

    @Test
    void shouldReturnAnOwnRoutine() {
        Routine own = routineRepository.saveAndFlush(routine("Fuerza", coach));

        ResponseEntity<String> response = exchange(HttpMethod.GET, own.getId().toString(), null, COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Fuerza", json(response).get("name").asString());
    }

    @Test
    void shouldReturn403ForAnotherCoachsRoutine() {
        Routine foreign = routineRepository.saveAndFlush(routine("Fuerza", otherCoach));

        ResponseEntity<String> response = exchange(HttpMethod.GET, foreign.getId().toString(), null, COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(RoutineAccessDeniedException.NOT_OWNER_MESSAGE, json(response).get("message").asString());
    }

    @Test
    void shouldReturn404ForAnUnknownRoutine() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, UUID.randomUUID().toString(), null,
                COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    private ResponseEntity<String> exchange(HttpMethod method, String suffix, Object body, String email) {
        String uri = suffix.isEmpty() || suffix.startsWith("?") ? PATH + suffix : PATH + "/" + suffix;
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

    private Set<String> fieldErrors(ResponseEntity<String> response) {
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        return fields;
    }

    private static List<String> names(JsonNode page) {
        List<String> names = new ArrayList<>();
        page.get("content").forEach(routine -> names.add(routine.get("name").asString()));
        return names;
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from routines", Integer.class);
        return count == null ? 0 : count;
    }
}
