package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-46 · Notas del entrenador: alta, listado según el rol (el atleta nunca recibe privadas), marcar como leída,
// pertenencia y validaciones
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class NoteE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";

    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
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

    private RestClient client;

    private Athlete leo;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        Coach ana = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        coachRepository.saveAndFlush(new Coach("Bruno", "Sosa", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        leo = athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), ana));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano. CASCADE vacía también notes
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- POST ----------

    @Test
    void shouldReturn201AndPersistTheNoteWithTheCoachAsAuthor() {
        // Act
        ResponseEntity<String> response = create(note(" Técnica ", "Bajar más lento", "VISIBLE_TO_ATHLETE"),
                COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("Técnica", body.get("title").asString());
        assertEquals("VISIBLE_TO_ATHLETE", body.get("type").asString());
        assertTrue(body.hasNonNull("createdAt"));
        assertTrue(body.get("readAt").isNull());

        Map<String, Object> row = jdbcTemplate.queryForMap("select author_id::text as author, note_type_id"
                + " from notes where id = ?::uuid", body.get("id").asString());
        assertEquals(coachRepository.findByEmail(COACH_EMAIL).orElseThrow().getId().toString(), row.get("author"));
        assertEquals((short) 2, ((Number) row.get("note_type_id")).shortValue());
    }

    @Test
    void shouldReturn400WhenTheNoteIsEmptyOrTooLong() {
        // Act
        ResponseEntity<String> empty = create(note("  ", "", null), COACH_EMAIL);
        ResponseEntity<String> tooLong = create(note("t".repeat(151), "c".repeat(2001), "PRIVATE"), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, empty.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(empty).get("message").asString());
        assertEquals(Set.of("title", "content", "type"), fieldErrors(empty));
        assertEquals(HttpStatus.BAD_REQUEST, tooLong.getStatusCode());
        assertEquals(Set.of("title", "content"), fieldErrors(tooLong));
        assertEquals(0, countNotes());
    }

    @Test
    void shouldReturn403WhenTheAthleteBelongsToAnotherCoach() {
        // Act
        ResponseEntity<String> response = create(note("Título", "Contenido", "PRIVATE"), OTHER_COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AthleteAccessDeniedException.MESSAGE, json(response).get("message").asString());
        assertEquals(0, countNotes());
    }

    @Test
    void shouldReturn403WhenTheAthleteTriesToWriteANote() {
        ResponseEntity<String> response = create(note("Título", "Contenido", "VISIBLE_TO_ATHLETE"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
    }

    // ---------- GET ----------

    @Test
    void shouldListEveryNoteToTheCoachAndOnlyTheVisibleOnesToTheAthlete() {
        // Arrange
        create(note("Privada", "Solo para mí", "PRIVATE"), COACH_EMAIL);
        create(note("Visible", "Para Leo", "VISIBLE_TO_ATHLETE"), COACH_EMAIL);

        // Act
        ResponseEntity<String> forCoach = list(COACH_EMAIL);
        ResponseEntity<String> forAthlete = list(ATHLETE_EMAIL);

        // Assert: el entrenador ve las dos, de la más reciente a la más antigua
        assertEquals(HttpStatus.OK, forCoach.getStatusCode());
        assertEquals(List.of("Visible", "Privada"), titles(json(forCoach)));
        // El atleta nunca recibe una privada, ni siquiera parte de su contenido
        assertEquals(HttpStatus.OK, forAthlete.getStatusCode());
        assertEquals(List.of("Visible"), titles(json(forAthlete)));
        assertFalse(forAthlete.getBody().contains("Solo para mí"));
    }

    @Test
    void shouldReturn403WhenAnotherCoachListsTheNotes() {
        assertEquals(HttpStatus.FORBIDDEN, list(OTHER_COACH_EMAIL).getStatusCode());
    }

    // ---------- PATCH /read ----------

    @Test
    void shouldMarkTheVisibleNoteAsReadOnlyOnce() {
        // Arrange
        String noteId = json(create(note("Visible", "Para Leo", "VISIBLE_TO_ATHLETE"), COACH_EMAIL)).get("id")
                .asString();

        // Act
        ResponseEntity<String> first = markAsRead(noteId, ATHLETE_EMAIL);
        ResponseEntity<String> second = markAsRead(noteId, ATHLETE_EMAIL);

        // Assert: idempotente, conserva la primera lectura
        assertEquals(HttpStatus.OK, first.getStatusCode());
        String readAt = json(first).get("readAt").asString();
        assertEquals(HttpStatus.OK, second.getStatusCode());
        assertEquals(readAt, json(second).get("readAt").asString());
        assertTrue(jdbcTemplate.queryForObject("select read_at is not null from notes where id = ?::uuid",
                Boolean.class, noteId));
    }

    @Test
    void shouldReturn404WhenTheAthleteMarksAPrivateNote() {
        // Arrange
        String noteId = json(create(note("Privada", "Solo para mí", "PRIVATE"), COACH_EMAIL)).get("id").asString();

        // Act
        ResponseEntity<String> response = markAsRead(noteId, ATHLETE_EMAIL);

        // Assert: misma respuesta que una nota inexistente
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertTrue(jdbcTemplate.queryForObject("select read_at is null from notes where id = ?::uuid",
                Boolean.class, noteId));
    }

    @Test
    void shouldReturn403WhenTheCoachTriesToMarkANoteAsRead() {
        String noteId = json(create(note("Visible", "Para Leo", "VISIBLE_TO_ATHLETE"), COACH_EMAIL)).get("id")
                .asString();

        assertEquals(HttpStatus.FORBIDDEN, markAsRead(noteId, COACH_EMAIL).getStatusCode());
    }

    // ---------- helpers ----------

    private static Map<String, Object> note(String title, String content, String type) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("content", content);
        body.put("type", type);
        return body;
    }

    private ResponseEntity<String> create(Object body, String email) {
        return exchange(HttpMethod.POST, path(), body, email);
    }

    private ResponseEntity<String> list(String email) {
        return exchange(HttpMethod.GET, path(), null, email);
    }

    private ResponseEntity<String> markAsRead(String noteId, String email) {
        return exchange(HttpMethod.PATCH, path() + "/" + noteId + "/read", null, email);
    }

    private String path() {
        return "/api/athletes/" + leo.getId() + "/notes";
    }

    private ResponseEntity<String> exchange(HttpMethod method, String uri, Object body, String email) {
        RestClient.RequestBodySpec request = client.method(method)
                .uri(uri)
                .headers(headers -> AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).body(jsonMapper.writeValueAsString(body));
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

    private static List<String> titles(JsonNode notes) {
        List<String> titles = new ArrayList<>();
        notes.forEach(note -> titles.add(note.get("title").asString()));
        return titles;
    }

    private int countNotes() {
        return jdbcTemplate.queryForObject("select count(*) from notes", Integer.class);
    }
}
