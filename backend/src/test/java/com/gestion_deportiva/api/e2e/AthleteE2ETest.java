package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.support.AuthHeaders;
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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class AthleteE2ETest {

    private static final String PATH = "/api/athletes";
    private static final String COACH_EMAIL = "ana@test.com";

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

    private Coach coach;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        coach = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano para que cada test sea independiente
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    @Test
    void shouldReturn201WithAthleteDataAndPersistItAssignedToTheAuthenticatedCoach() {
        // Arrange
        CreateAthleteRequest request = createAthleteRequest("leo@test.com");

        // Act
        ResponseEntity<String> response = postAsCoach(request);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + id));
        assertEquals(coach.getId().toString(), body.get("coachId").asString());
        assertEquals("Leo", body.get("firstName").asString());
        assertEquals("Gil", body.get("lastName").asString());
        assertEquals("leo@test.com", body.get("email").asString());
        assertEquals(request.phone(), body.get("phone").asString());
        assertEquals("ACTIVE", body.get("status").asString());
        assertEquals("MALE", body.get("sex").asString());
        assertEquals("INTERMEDIATE", body.get("experienceLevel").asString());
        assertEquals("2000-05-20", body.get("birthDate").asString());
        assertEquals(0, request.heightCm().compareTo(body.get("heightCm").decimalValue()));
        assertEquals(0, request.initialWeightKg().compareTo(body.get("initialWeightKg").decimalValue()));
        assertEquals(request.goal(), body.get("goal").asString());
        assertEquals(request.injuries(), body.get("injuries").asString());
        assertEquals(request.limitations(), body.get("limitations").asString());
        assertEquals(4, body.get("availableDays").asInt());
        assertEquals("2026-11-01", body.get("startDate").asString());
        assertTrue(body.hasNonNull("createdAt"));
        assertFalse(body.has("password"));
        assertFalse(body.has("passwordHash"));

        // Assert: base de datos (fila en users con rol ATHLETE y su fila en athletes con el coach)
        Map<String, Object> user = jdbcTemplate.queryForMap(
                "select role_id, password_hash from users where id = ?::uuid", id);
        assertEquals((short) Role.ATHLETE.getId(), ((Number) user.get("role_id")).shortValue());
        assertTrue(passwordEncoder.matches(RAW_PASSWORD, (String) user.get("password_hash")));
        Map<String, Object> athlete = jdbcTemplate.queryForMap(
                "select coach_id::text as coach_id, status_id, sex_id, available_days from athletes"
                        + " where user_id = ?::uuid", id);
        assertEquals(coach.getId().toString(), athlete.get("coach_id"));
        assertEquals((short) AthleteStatus.ACTIVE.getId(), ((Number) athlete.get("status_id")).shortValue());
        assertEquals(request.sex().getId(), ((Number) athlete.get("sex_id")).shortValue());
        assertEquals(4, ((Number) athlete.get("available_days")).intValue());
    }

    @Test
    void shouldAcceptCoachEmailInAnyCase() {
        // Act
        ResponseEntity<String> response = post(createAthleteRequest("leo@test.com"), "ANA@Test.com", RAW_PASSWORD);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    void shouldIgnoreRoleStatusAndCoachIdSentInBody() {
        // Act: intenta crear un coach, en otro estado y asignado a otro entrenador
        ResponseEntity<String> response = postAsCoach("""
                {"firstName": "Leo", "lastName": "Gil", "email": "leo@test.com", "password": "password123",
                 "role": "COACH", "status": "INACTIVE", "coachId": "00000000-0000-0000-0000-000000000000"}
                """);

        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("ACTIVE", body.get("status").asString());
        assertEquals(coach.getId().toString(), body.get("coachId").asString());
        Short roleId = jdbcTemplate.queryForObject(
                "select role_id from users where email = 'leo@test.com'", Short.class);
        assertEquals(Role.ATHLETE.getId(), roleId);
        assertEquals(1, count("coaches"));
    }

    @Test
    void shouldReturn401WithoutCredentials() {
        // Act
        ResponseEntity<String> response = client.post()
                .uri(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonMapper.writeValueAsString(createAthleteRequest("leo@test.com")))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);

        // Assert
        assertUnauthorized(response);
    }

    @Test
    void shouldReturn401WhenPasswordIsWrong() {
        // Act
        ResponseEntity<String> response = post(createAthleteRequest("leo@test.com"), COACH_EMAIL, "otra-clave");

        // Assert
        assertUnauthorized(response);
    }

    @Test
    void shouldReturn401WhenUserDoesNotExist() {
        // Act
        ResponseEntity<String> response = post(createAthleteRequest("leo@test.com"), "nadie@test.com", RAW_PASSWORD);

        // Assert
        assertUnauthorized(response);
    }

    @Test
    void shouldReturn401WhenCoachIsInactive() {
        // Arrange
        coach.deactivate();
        coachRepository.saveAndFlush(coach);

        // Act
        ResponseEntity<String> response = postAsCoach(createAthleteRequest("leo@test.com"));

        // Assert
        assertUnauthorized(response);
    }

    @Test
    void shouldReturn403WhenAuthenticatedUserIsAnAthlete() {
        // Arrange: un atleta con credenciales válidas
        assertEquals(HttpStatus.CREATED, postAsCoach(createAthleteRequest("leo@test.com")).getStatusCode());

        // Act
        ResponseEntity<String> response = post(createAthleteRequest("otro@test.com"), "leo@test.com", RAW_PASSWORD);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(403, body.get("status").asInt());
        assertEquals("No tiene permisos para acceder a este recurso", body.get("message").asString());
        assertEquals(PATH, body.get("path").asString());
        assertEquals(1, count("athletes"));
    }

    @Test
    void shouldReturn409WhenEmailAlreadyRegisteredIgnoringCase() {
        // Arrange
        assertEquals(HttpStatus.CREATED, postAsCoach(createAthleteRequest("leo@test.com")).getStatusCode());

        // Act
        ResponseEntity<String> response = postAsCoach(createAthleteRequest("LEO@Test.com"));

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(409, body.get("status").asInt());
        assertEquals("Ya existe un usuario registrado con el email leo@test.com", body.get("message").asString());
        assertEquals(PATH, body.get("path").asString());
        assertEquals(1, count("athletes"));
    }

    @Test
    void shouldReturn409WhenEmailBelongsToACoach() {
        // Act: el email es único en toda la tabla users, no solo entre atletas
        ResponseEntity<String> response = postAsCoach(createAthleteRequest(COACH_EMAIL));

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un usuario registrado con el email " + COACH_EMAIL,
                json(response).get("message").asString());
        assertEquals(0, count("athletes"));
    }

    @Test
    void shouldReturn400WithFieldDetailsWhenBodyIsInvalid() {
        // Act
        ResponseEntity<String> response = postAsCoach("""
                {"firstName": "", "lastName": "Gil", "email": "no-es-un-email", "password": "1234567",
                 "heightCm": -1, "availableDays": 8}
                """);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(400, body.get("status").asInt());
        Set<String> fields = new HashSet<>();
        body.get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("firstName", "email", "password", "heightCm", "availableDays"), fields);
        assertEquals(0, count("athletes"));
    }

    @Test
    void shouldReturn400WhenPasswordExceeds72BytesBecauseOfMultibyteCharacters() {
        // Arrange: 72 caracteres pero 73 bytes en UTF-8 por la ñ (BCrypt lanzaría IllegalArgumentException)
        String password = "p".repeat(71) + "ñ";

        // Act
        ResponseEntity<String> response = postAsCoach(Map.of("firstName", "Leo", "lastName", "Gil",
                "email", "leo@test.com", "password", password));

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("password"), fields);
        assertEquals(0, count("athletes"));
    }

    @Test
    void shouldReturn400WhenEnumValueIsUnknown() {
        // Act
        ResponseEntity<String> response = postAsCoach("""
                {"firstName": "Leo", "lastName": "Gil", "email": "leo@test.com", "password": "password123",
                 "sex": "UNKNOWN"}
                """);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, json(response).get("status").asInt());
        assertEquals(0, count("athletes"));
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() {
        // Act
        ResponseEntity<String> response = postAsCoach("{\"firstName\": \"Leo\", ");

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, json(response).get("status").asInt());
        assertEquals(0, count("athletes"));
    }

    // ---------- GET /api/athletes/{id} (US-04: pertenencia) ----------

    @Test
    void shouldReturnTheAthleteToItsCoach() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = get(leo.getId().toString(), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(leo.getId().toString(), body.get("id").asString());
        assertEquals(coach.getId().toString(), body.get("coachId").asString());
        assertEquals("leo@test.com", body.get("email").asString());
        assertFalse(body.has("passwordHash"));
    }

    @Test
    void shouldReturnTheAthleteToHimself() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = get(leo.getId().toString(), "leo@test.com");

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("leo@test.com", json(response).get("email").asString());
    }

    @Test
    void shouldReturn403WhenTheAthleteBelongsToAnotherCoach() {
        // Arrange: Bruno es otro entrenador
        Athlete leo = saveAthlete("leo@test.com", coach);
        saveCoach("bruno@test.com");

        // Act
        ResponseEntity<String> response = get(leo.getId().toString(), "bruno@test.com");

        // Assert
        assertForbidden(response, leo);
    }

    @Test
    void shouldReturn403WhenAnAthleteAsksForAnotherAthlete() {
        // Arrange: Mía es otra atleta del mismo entrenador
        Athlete leo = saveAthlete("leo@test.com", coach);
        saveAthlete("mia@test.com", coach);

        // Act
        ResponseEntity<String> response = get(leo.getId().toString(), "mia@test.com");

        // Assert
        assertForbidden(response, leo);
    }

    @Test
    void shouldReturn403ToTheFormerCoachOfAnUnlinkedAthleteButNotToTheAthlete() {
        // Arrange: atleta desvinculado (US-07), sin entrenador
        Athlete leo = saveAthlete("leo@test.com", null);

        // Act + Assert
        assertForbidden(get(leo.getId().toString(), COACH_EMAIL), leo);
        assertEquals(HttpStatus.OK, get(leo.getId().toString(), "leo@test.com").getStatusCode());
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        // Arrange
        UUID missing = UUID.randomUUID();

        // Act
        ResponseEntity<String> response = get(missing.toString(), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(404, body.get("status").asInt());
        assertEquals("No existe el atleta con id " + missing, body.get("message").asString());
    }

    @Test
    void shouldReturn400WhenTheIdIsNotAUuid() {
        // Act
        ResponseEntity<String> response = get("no-es-un-uuid", COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, json(response).get("status").asInt());
    }

    @Test
    void shouldReturn401WhenGettingAnAthleteWithoutCredentials() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = get(leo.getId().toString(), null);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Debe iniciar sesión para acceder a este recurso", json(response).get("message").asString());
    }

    // ---------- GET /api/athletes ("Mis atletas", US-08) ----------

    @Test
    void shouldListOnlyTheAthletesLinkedToTheAuthenticatedCoach() {
        // Arrange: Bruno es otro entrenador; Ema está desvinculada
        Coach bruno = saveCoach("bruno@test.com");
        saveAthlete("leo@test.com", coach, "Leo", "Gil", "Hipertrofia");
        saveAthlete("mia@test.com", coach, "Mía", "Sosa", "Bajar de peso");
        saveAthlete("teo@test.com", bruno, "Teo", "Ruiz", null);
        saveAthlete("ema@test.com", null, "Ema", "Paz", null);

        // Act
        ResponseEntity<String> response = list("", COACH_EMAIL);

        // Assert: ordenados por apellido y nombre, sin datos sensibles
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(List.of("leo@test.com", "mia@test.com"), emails(body));
        assertEquals(coach.getId().toString(), body.get("content").get(0).get("coachId").asString());
        assertEquals(0, body.get("page").asInt());
        assertEquals(20, body.get("size").asInt());
        assertEquals(2, body.get("totalElements").asLong());
        assertEquals(1, body.get("totalPages").asInt());
        assertFalse(response.getBody().contains("passwordHash"));
    }

    @Test
    void shouldPaginateTheCoachsAthletes() {
        // Arrange
        saveAthlete("a@test.com", coach, "Ana", "Alvarez", null);
        saveAthlete("b@test.com", coach, "Beto", "Bravo", null);
        saveAthlete("c@test.com", coach, "Caro", "Castro", null);

        // Act
        JsonNode body = json(list("?page=1&size=2", COACH_EMAIL));

        // Assert
        assertEquals(List.of("c@test.com"), emails(body));
        assertEquals(1, body.get("page").asInt());
        assertEquals(2, body.get("size").asInt());
        assertEquals(3, body.get("totalElements").asLong());
        assertEquals(2, body.get("totalPages").asInt());
    }

    @Test
    void shouldLimitThePageSizeTo100() {
        // Act
        JsonNode body = json(list("?size=500", COACH_EMAIL));

        // Assert
        assertEquals(100, body.get("size").asInt());
    }

    @Test
    void shouldFilterByNameGoalOrBoth() {
        // Arrange
        saveAthlete("leo@test.com", coach, "Leo", "Gil", "Hipertrofia");
        saveAthlete("lea@test.com", coach, "Lea", "Gómez", "Resistencia");
        saveAthlete("mia@test.com", coach, "Mía", "Sosa", "Hipertrofia y fuerza");

        // Act + Assert
        assertEquals(List.of("leo@test.com", "lea@test.com"), emails(json(list("?name=LE", COACH_EMAIL))));
        assertEquals(List.of("leo@test.com"), emails(json(list("?name=leo gil", COACH_EMAIL))));
        assertEquals(List.of("leo@test.com", "mia@test.com"), emails(json(list("?goal=hipertrofia", COACH_EMAIL))));
        assertEquals(List.of("leo@test.com"), emails(json(list("?name=le&goal=hiper", COACH_EMAIL))));
        assertEquals(3, emails(json(list("?name=&goal=", COACH_EMAIL))).size());
    }

    @Test
    void shouldReturn400WhenTheNameFilterIsTooLong() {
        // Act
        ResponseEntity<String> response = list("?name=" + "a".repeat(101), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("name", json(response).get("fieldErrors").get(0).get("field").asString());
    }

    @Test
    void shouldReturn403WhenAnAthleteListsAthletes() {
        // Arrange
        saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = list("", "leo@test.com");

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(403, json(response).get("status").asInt());
    }

    @Test
    void shouldReturn401WhenListingAthletesWithoutCredentials() {
        // Act
        ResponseEntity<String> response = list("", null);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Debe iniciar sesión para acceder a este recurso", json(response).get("message").asString());
    }

    private ResponseEntity<String> postAsCoach(Object body) {
        return post(body, COACH_EMAIL, RAW_PASSWORD);
    }

    private ResponseEntity<String> post(Object body, String email, String password) {
        return client.post()
                .uri(PATH)
                .headers(headers -> AuthHeaders.authenticate(headers, client, email, password))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body instanceof String raw ? raw : jsonMapper.writeValueAsString(body))
                .retrieve()
                // Los 4xx se validan en cada test, no deben lanzar excepción
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    // GET /api/athletes/{id} con la sesión de ese email (null = sin token)
    private ResponseEntity<String> get(String id, String email) {
        return client.get()
                .uri(PATH + "/" + id)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    }
                })
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    // GET /api/athletes + query string con la sesión de ese email (null = sin token)
    private ResponseEntity<String> list(String query, String email) {
        return client.get()
                .uri(PATH + query)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    }
                })
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private List<String> emails(JsonNode page) {
        List<String> emails = new ArrayList<>();
        page.get("content").forEach(athlete -> emails.add(athlete.get("email").asString()));
        return emails;
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Bruno", "Sosa", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    // owner null = atleta desvinculado
    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }

    private Athlete saveAthlete(String email, Coach owner, String firstName, String lastName, String goal) {
        return athleteRepository.saveAndFlush(Athlete.builder()
                .firstName(firstName).lastName(lastName).email(email)
                .passwordHash(passwordEncoder.encode(RAW_PASSWORD))
                .coach(owner).goal(goal)
                .build());
    }

    // 403 con el formato estándar y sin datos del atleta pedido
    private void assertForbidden(ResponseEntity<String> response, Athlete requested) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(403, body.get("status").asInt());
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertEquals(PATH + "/" + requested.getId(), body.get("path").asString());
        assertFalse(response.getBody().contains(requested.getEmail()));
    }

    private void assertUnauthorized(ResponseEntity<String> response) {
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(401, body.get("status").asInt());
        assertEquals("Debe iniciar sesión para acceder a este recurso", body.get("message").asString());
        assertEquals(0, count("athletes"));
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private int count(String table) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }
}
