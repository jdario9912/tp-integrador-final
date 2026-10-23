package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.user.model.enums.Role;
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

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.registerCoachRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class CoachE2ETest {

    private static final String PATH = "/api/coaches";

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private AthleteRepository athleteRepository;

    private RestClient client;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano para que cada test sea independiente
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    @Test
    void shouldReturn201WithCoachDataAndPersistUserAndCoach() {
        // Arrange
        RegisterCoachRequest request = registerCoachRequest("ana@test.com");

        // Act: sin autenticación ni token CSRF, como un cliente que todavía no tiene cuenta
        ResponseEntity<String> response = post(request);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + id));
        assertEquals("Ana", body.get("firstName").asString());
        assertEquals("Paz", body.get("lastName").asString());
        assertEquals("ana@test.com", body.get("email").asString());
        assertEquals(request.phone(), body.get("phone").asString());
        assertEquals(request.specialty(), body.get("specialty").asString());
        assertEquals(request.licenseNumber(), body.get("licenseNumber").asString());
        assertEquals(request.bio(), body.get("bio").asString());
        assertTrue(body.hasNonNull("createdAt"));
        assertNoSensitiveData(body);

        // Assert: base de datos (fila en users con rol COACH y su fila en coaches)
        Map<String, Object> user = jdbcTemplate.queryForMap(
                "select role_id, password_hash from users where id = ?::uuid", id);
        assertEquals((short) Role.COACH.getId(), ((Number) user.get("role_id")).shortValue());
        String hash = (String) user.get("password_hash");
        assertFalse(hash.contains(RAW_PASSWORD));
        assertTrue(passwordEncoder.matches(RAW_PASSWORD, hash));
        Map<String, Object> coach = jdbcTemplate.queryForMap(
                "select specialty, license_number, bio from coaches where user_id = ?::uuid", id);
        assertEquals(request.specialty(), coach.get("specialty"));
        assertEquals(request.licenseNumber(), coach.get("license_number"));
        assertEquals(request.bio(), coach.get("bio"));
    }

    @Test
    void shouldIgnoreRoleSentInBodyAndAlwaysCreateCoach() {
        // Act
        ResponseEntity<String> response = post("""
                {"firstName": "Ana", "lastName": "Paz", "email": "ana@test.com",
                 "password": "password123", "role": "ATHLETE"}
                """);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Short roleId = jdbcTemplate.queryForObject(
                "select role_id from users where email = 'ana@test.com'", Short.class);
        assertEquals(Role.COACH.getId(), roleId);
        assertEquals(0, count("athletes"));
        assertEquals(1, count("coaches"));
    }

    @Test
    void shouldReturn409WhenEmailAlreadyRegisteredIgnoringCase() {
        // Arrange
        assertEquals(HttpStatus.CREATED, post(registerCoachRequest("ana@test.com")).getStatusCode());

        // Act
        ResponseEntity<String> response = post(registerCoachRequest("ANA@Test.com"));

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(409, body.get("status").asInt());
        assertEquals("Conflict", body.get("error").asString());
        assertEquals("Ya existe un usuario registrado con el email ana@test.com", body.get("message").asString());
        assertEquals(PATH, body.get("path").asString());
        assertEquals(1, count("users"));
    }

    @Test
    void shouldReturn409WhenEmailBelongsToAnAthlete() {
        // Arrange: el email es único en toda la tabla users, no solo entre entrenadores
        athleteRepository.saveAndFlush(athlete("leo@test.com", null));

        // Act
        ResponseEntity<String> response = post(registerCoachRequest("leo@test.com"));

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un usuario registrado con el email leo@test.com",
                json(response).get("message").asString());
        assertEquals(0, count("coaches"));
    }

    @Test
    void shouldReturn400WithFieldDetailsWhenBodyIsInvalid() {
        // Act
        ResponseEntity<String> response = post("""
                {"firstName": "", "lastName": "Paz", "email": "no-es-un-email", "password": "1234567"}
                """);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(400, body.get("status").asInt());
        Set<String> fields = new HashSet<>();
        body.get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("firstName", "email", "password"), fields);
        assertEquals(0, count("users"));
    }

    @Test
    void shouldReturn400WhenPasswordExceeds72BytesBecauseOfMultibyteCharacters() {
        // Arrange: 72 caracteres pero 73 bytes en UTF-8 por la ñ (BCrypt lanzaría IllegalArgumentException)
        String password = "p".repeat(71) + "ñ";

        // Act
        ResponseEntity<String> response = post(Map.of("firstName", "Ana", "lastName", "Paz",
                "email", "ana@test.com", "password", password));

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("password"), fields);
        assertEquals(0, count("users"));
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() {
        // Act
        ResponseEntity<String> response = post("{\"firstName\": \"Ana\", ");

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, json(response).get("status").asInt());
        assertEquals(0, count("users"));
    }

    private ResponseEntity<String> post(Object body) {
        return client.post()
                .uri(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body instanceof String raw ? raw : jsonMapper.writeValueAsString(body))
                .retrieve()
                // Los 4xx se validan en cada test, no deben lanzar excepción
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private int count(String table) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }

    private static void assertNoSensitiveData(JsonNode body) {
        assertFalse(body.has("password"));
        assertFalse(body.has("passwordHash"));
    }
}
