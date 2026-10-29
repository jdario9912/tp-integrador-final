package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.dto.UpdateAthleteRequest;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.auth.exception.AccountDisabledException;
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
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.updateAthleteRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.updateAthleteRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
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

    // ---------- PUT /api/athletes/{id} (US-07: edición) ----------

    @Test
    void shouldUpdateTheAthleteAndReflectTheChangesInItsProfileAndTheList() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        UpdateAthleteRequest request = updateAthleteRequest("leandro@test.com");

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), request, COACH_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(leo.getId().toString(), body.get("id").asString());
        assertEquals(coach.getId().toString(), body.get("coachId").asString());
        assertEquals("Leandro", body.get("firstName").asString());
        assertEquals("Gimenez", body.get("lastName").asString());
        assertEquals("leandro@test.com", body.get("email").asString());
        assertEquals(request.phone(), body.get("phone").asString());
        assertEquals("ACTIVE", body.get("status").asString());
        assertTrue(body.get("active").asBoolean());
        assertEquals("OTHER", body.get("sex").asString());
        assertEquals("ADVANCED", body.get("experienceLevel").asString());
        assertEquals("1998-03-10", body.get("birthDate").asString());
        assertEquals(0, request.heightCm().compareTo(body.get("heightCm").decimalValue()));
        assertEquals(0, request.initialWeightKg().compareTo(body.get("initialWeightKg").decimalValue()));
        assertEquals(request.goal(), body.get("goal").asString());
        assertEquals(request.injuries(), body.get("injuries").asString());
        assertEquals(request.limitations(), body.get("limitations").asString());
        assertEquals(5, body.get("availableDays").asInt());
        assertEquals("2026-12-01", body.get("startDate").asString());
        assertFalse(body.has("passwordHash"));

        // Assert: la ficha y el listado muestran los cambios
        assertEquals("Leandro", json(get(leo.getId().toString(), COACH_EMAIL)).get("firstName").asString());
        assertEquals(List.of("leandro@test.com"), emails(json(list("", COACH_EMAIL))));
        // Con el email nuevo puede iniciar sesión (la contraseña no cambió)
        assertEquals(HttpStatus.OK, get(leo.getId().toString(), "leandro@test.com").getStatusCode());
    }

    @Test
    void shouldClearTheOptionalFieldsNotSent() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach, "Leo", "Gil", "Hipertrofia");

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(),
                updateAthleteRequestWithOnlyRequired("leo@test.com"), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(json(response).get("goal").isNull());
        assertNull(jdbcTemplate.queryForObject("select goal from athletes where user_id = ?", String.class,
                leo.getId()));
    }

    @Test
    void shouldAcceptItsOwnEmailInAnotherCase() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), updateAthleteRequest("LEO@Test.com"),
                COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("leo@test.com", json(response).get("email").asString());
    }

    @Test
    void shouldIgnorePasswordRoleStatusActiveAndCoachIdSentInTheUpdate() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        Coach bruno = saveCoach("bruno@test.com");

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), """
                {"firstName": "Leo", "lastName": "Gil", "email": "leo@test.com", "password": "otra-clave-123",
                 "role": "COACH", "status": "INACTIVE", "active": false, "coachId": "%s"}
                """.formatted(bruno.getId()), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("ACTIVE", body.get("status").asString());
        assertTrue(body.get("active").asBoolean());
        assertEquals(coach.getId().toString(), body.get("coachId").asString());
        // Sigue entrando con la contraseña de siempre
        assertEquals(HttpStatus.OK, get(leo.getId().toString(), "leo@test.com").getStatusCode());
    }

    @Test
    void shouldReturn409WhenTheNewEmailBelongsToAnotherAthleteIgnoringCase() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        saveAthlete("mia@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), updateAthleteRequest("MIA@test.com"),
                COACH_EMAIL);

        // Assert: no se modificó nada
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(409, body.get("status").asInt());
        assertEquals("Ya existe un usuario registrado con el email mia@test.com", body.get("message").asString());
        assertEquals(PATH + "/" + leo.getId(), body.get("path").asString());
        assertEquals("Leo", jdbcTemplate.queryForObject("select first_name from users where id = ?",
                String.class, leo.getId()));
    }

    @Test
    void shouldReturn409WhenTheNewEmailBelongsToACoach() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), updateAthleteRequest(COACH_EMAIL),
                COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un usuario registrado con el email " + COACH_EMAIL,
                json(response).get("message").asString());
    }

    @Test
    void shouldReturn400WithFieldDetailsWhenTheUpdateIsInvalid() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), """
                {"firstName": "", "lastName": "%s", "email": "no-es-un-email", "phone": "%s",
                 "birthDate": "2999-01-01", "heightCm": -1, "initialWeightKg": 70.123, "availableDays": 8}
                """.formatted("b".repeat(101), "1".repeat(31)), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(400, body.get("status").asInt());
        Set<String> fields = new HashSet<>();
        body.get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("firstName", "lastName", "email", "phone", "birthDate", "heightCm", "initialWeightKg",
                "availableDays"), fields);
        assertEquals("leo@test.com", jdbcTemplate.queryForObject("select email from users where id = ?",
                String.class, leo.getId()));
    }

    @Test
    void shouldReturn400WhenTheUpdateHasNoRequiredFields() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), "{}", COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Set<String> fields = new HashSet<>();
        json(response).get("fieldErrors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("firstName", "lastName", "email"), fields);
    }

    @Test
    void shouldReturn400WhenTheUpdateHasAnUnknownEnumValue() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), """
                {"firstName": "Leo", "lastName": "Gil", "email": "leo@test.com", "experienceLevel": "EXPERT"}
                """, COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, json(response).get("status").asInt());
    }

    @Test
    void shouldReturn400WhenTheUpdateJsonIsMalformedOrMissing() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act + Assert
        assertEquals(HttpStatus.BAD_REQUEST,
                put(leo.getId().toString(), "{\"firstName\": \"Leo\", ", COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, put(leo.getId().toString(), "", COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturn404WhenUpdatingAnAthleteThatDoesNotExist() {
        // Arrange
        UUID missing = UUID.randomUUID();

        // Act
        ResponseEntity<String> response = put(missing.toString(), updateAthleteRequest("leo@test.com"), COACH_EMAIL);

        // Assert
        assertNotFound(response, missing);
    }

    @Test
    void shouldReturn403AndNotModifyWhenUpdatingAnAthleteOfAnotherCoach() {
        // Arrange
        Coach bruno = saveCoach("bruno@test.com");
        Athlete teo = saveAthlete("teo@test.com", bruno);

        // Act
        ResponseEntity<String> response = put(teo.getId().toString(), updateAthleteRequest("hack@test.com"),
                COACH_EMAIL);

        // Assert
        assertForbidden(response, teo);
        assertEquals("teo@test.com", jdbcTemplate.queryForObject("select email from users where id = ?",
                String.class, teo.getId()));
    }

    @Test
    void shouldReturn400WhenUpdatingWithAnIdThatIsNotAUuid() {
        assertEquals(HttpStatus.BAD_REQUEST,
                put("no-es-un-uuid", updateAthleteRequest("leo@test.com"), COACH_EMAIL).getStatusCode());
    }

    // ---------- desactivar / reactivar (US-07) ----------

    @Test
    void shouldDeactivateTheAthleteSoItCannotLogInOrRefreshButStaysInTheCoachsList() {
        // Arrange: el atleta tiene una sesión abierta
        Athlete leo = saveAthlete("leo@test.com", coach);
        String refreshToken = json(login("leo@test.com")).get("refreshToken").asString();

        // Act
        ResponseEntity<String> response = post(leo.getId() + "/deactivate", COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertFalse(body.get("active").asBoolean());
        assertEquals(coach.getId().toString(), body.get("coachId").asString());
        assertEquals(Boolean.FALSE, jdbcTemplate.queryForObject("select active from users where id = ?",
                Boolean.class, leo.getId()));
        assertAccountDisabled(login("leo@test.com"));
        assertAccountDisabled(refresh(refreshToken));
        assertEquals(List.of("leo@test.com"), emails(json(list("", COACH_EMAIL))));
        assertFalse(json(get(leo.getId().toString(), COACH_EMAIL)).get("active").asBoolean());
    }

    @Test
    void shouldReactivateTheAthleteSoItCanLogInAgain() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        assertEquals(HttpStatus.OK, post(leo.getId() + "/deactivate", COACH_EMAIL).getStatusCode());

        // Act
        ResponseEntity<String> response = post(leo.getId() + "/reactivate", COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(json(response).get("active").asBoolean());
        assertEquals(HttpStatus.OK, login("leo@test.com").getStatusCode());
    }

    @Test
    void shouldDeactivateAndReactivateIdempotently() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act + Assert
        assertEquals(HttpStatus.OK, post(leo.getId() + "/reactivate", COACH_EMAIL).getStatusCode());
        assertEquals(HttpStatus.OK, post(leo.getId() + "/deactivate", COACH_EMAIL).getStatusCode());
        ResponseEntity<String> again = post(leo.getId() + "/deactivate", COACH_EMAIL);
        assertEquals(HttpStatus.OK, again.getStatusCode());
        assertFalse(json(again).get("active").asBoolean());
    }

    @Test
    void shouldReturn404And403WhenDeactivatingOrReactivatingAnAthleteThatIsNotMine() {
        // Arrange
        UUID missing = UUID.randomUUID();
        Athlete teo = saveAthlete("teo@test.com", saveCoach("bruno@test.com"));

        // Act + Assert
        for (String action : List.of("/deactivate", "/reactivate")) {
            assertNotFound(post(missing + action, COACH_EMAIL), missing, action);
            assertForbidden(post(teo.getId() + action, COACH_EMAIL), teo, action);
        }
        assertEquals(HttpStatus.OK, login("teo@test.com").getStatusCode());
    }

    // ---------- PATCH /api/athletes/{id}/unlink (US-07: desvincular) ----------

    @Test
    void shouldUnlinkTheAthleteKeepingItsAccountAndData() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach, "Leo", "Gil", "Hipertrofia");
        saveAthlete("mia@test.com", coach, "Mía", "Sosa", null);

        // Act
        ResponseEntity<String> response = unlink(leo.getId().toString(), COACH_EMAIL);

        // Assert: 204 sin cuerpo
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertNull(response.getBody());
        // Sale del listado y el ex-entrenador ya no accede
        assertEquals(List.of("mia@test.com"), emails(json(list("", COACH_EMAIL))));
        assertForbidden(get(leo.getId().toString(), COACH_EMAIL), leo);
        // Sigue en la base con sus datos y su cuenta activa
        Map<String, Object> row = jdbcTemplate.queryForMap("select u.active, u.deleted_at, a.coach_id, a.goal from users u"
                + " join athletes a on a.user_id = u.id where u.id = ?", leo.getId());
        assertEquals(Boolean.TRUE, row.get("active"));
        assertNull(row.get("deleted_at"));
        assertNull(row.get("coach_id"));
        assertEquals("Hipertrofia", row.get("goal"));
        // El atleta sigue pudiendo entrar y ver su ficha
        ResponseEntity<String> own = get(leo.getId().toString(), "leo@test.com");
        assertEquals(HttpStatus.OK, own.getStatusCode());
        assertTrue(json(own).get("coachId").isNull());
    }

    @Test
    void shouldReturn403ForEveryOperationOfTheFormerCoachAfterUnlinking() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        assertEquals(HttpStatus.NO_CONTENT, unlink(leo.getId().toString(), COACH_EMAIL).getStatusCode());

        // Act + Assert
        assertForbidden(unlink(leo.getId().toString(), COACH_EMAIL), leo, "/unlink");
        assertForbidden(delete(leo.getId().toString(), COACH_EMAIL), leo);
        assertForbidden(put(leo.getId().toString(), updateAthleteRequest("leo@test.com"), COACH_EMAIL), leo);
        assertForbidden(post(leo.getId() + "/deactivate", COACH_EMAIL), leo, "/deactivate");
        assertForbidden(post(leo.getId() + "/reactivate", COACH_EMAIL), leo, "/reactivate");
    }

    @Test
    void shouldReturn404WhenUnlinkingAnAthleteThatDoesNotExist() {
        // Arrange
        UUID missing = UUID.randomUUID();

        // Act + Assert
        assertNotFound(unlink(missing.toString(), COACH_EMAIL), missing, "/unlink");
    }

    @Test
    void shouldReturn403AndKeepTheLinkWhenUnlinkingAnAthleteOfAnotherCoach() {
        // Arrange
        Coach bruno = saveCoach("bruno@test.com");
        Athlete teo = saveAthlete("teo@test.com", bruno);

        // Act
        ResponseEntity<String> response = unlink(teo.getId().toString(), COACH_EMAIL);

        // Assert
        assertForbidden(response, teo, "/unlink");
        assertEquals(bruno.getId().toString(), jdbcTemplate.queryForObject(
                "select coach_id::text from athletes where user_id = ?", String.class, teo.getId()));
    }

    @Test
    void shouldIgnoreABodySentToUnlink() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        Coach bruno = saveCoach("bruno@test.com");

        // Act: intenta pasárselo a otro entrenador
        ResponseEntity<String> response = exchange(HttpMethod.PATCH, leo.getId() + "/unlink",
                "{\"coachId\": \"" + bruno.getId() + "\"}", COACH_EMAIL, null);

        // Assert
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertNull(jdbcTemplate.queryForObject("select coach_id from athletes where user_id = ?", UUID.class,
                leo.getId()));
    }

    @Test
    void shouldReturn400WhenUnlinkingWithAnIdThatIsNotAUuid() {
        assertEquals(HttpStatus.BAD_REQUEST, unlink("no-es-un-uuid", COACH_EMAIL).getStatusCode());
    }

    // ---------- DELETE /api/athletes/{id} (US-07: eliminar, baja lógica) ----------

    @Test
    void shouldSoftDeleteTheAthleteKeepingItsRowAndData() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach, "Leo", "Gil", "Hipertrofia");
        saveAthlete("mia@test.com", coach, "Mía", "Sosa", null);

        // Act
        ResponseEntity<String> response = delete(leo.getId().toString(), COACH_EMAIL);

        // Assert: 204 sin cuerpo
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertNull(response.getBody());
        // La fila sigue con sus datos y el vínculo, marcada como eliminada y desactivada
        Map<String, Object> row = jdbcTemplate.queryForMap("select u.active, u.deleted_at, a.coach_id::text as"
                + " coach_id, a.goal from users u join athletes a on a.user_id = u.id where u.id = ?", leo.getId());
        assertEquals(Boolean.FALSE, row.get("active"));
        assertNotNull(row.get("deleted_at"));
        assertEquals(coach.getId().toString(), row.get("coach_id"));
        assertEquals("Hipertrofia", row.get("goal"));
        // Para la aplicación ya no existe
        assertEquals(List.of("mia@test.com"), emails(json(list("", COACH_EMAIL))));
        assertNotFound(get(leo.getId().toString(), COACH_EMAIL), leo.getId());
    }

    @Test
    void shouldNotLetADeletedAthleteLogInRefreshOrUseItsToken() {
        // Arrange: el atleta tiene una sesión abierta
        Athlete leo = saveAthlete("leo@test.com", coach);
        JsonNode session = json(login("leo@test.com"));
        String accessToken = session.get("accessToken").asString();
        String refreshToken = session.get("refreshToken").asString();

        // Act
        assertEquals(HttpStatus.NO_CONTENT, delete(leo.getId().toString(), COACH_EMAIL).getStatusCode());

        // Assert: el login responde como si el email no existiera (no revela que fue eliminado)
        ResponseEntity<String> loginResponse = login("leo@test.com");
        assertEquals(HttpStatus.UNAUTHORIZED, loginResponse.getStatusCode());
        assertFalse(loginResponse.getBody().contains("accessToken"));
        assertEquals(HttpStatus.UNAUTHORIZED, refresh(refreshToken).getStatusCode());
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from refresh_tokens where user_id = ?",
                Integer.class, leo.getId()));
        // El access token todavía vigente no sirve para ver sus datos
        assertEquals(HttpStatus.NOT_FOUND,
                exchange(HttpMethod.GET, leo.getId().toString(), null, null, accessToken).getStatusCode());
    }

    @Test
    void shouldReturn404ForEveryOperationOnADeletedAthlete() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        assertEquals(HttpStatus.NO_CONTENT, delete(leo.getId().toString(), COACH_EMAIL).getStatusCode());
        UUID id = leo.getId();

        // Act + Assert: un segundo DELETE también es 404
        assertNotFound(delete(id.toString(), COACH_EMAIL), id);
        assertNotFound(put(id.toString(), updateAthleteRequest("leo@test.com"), COACH_EMAIL), id);
        assertNotFound(post(id + "/deactivate", COACH_EMAIL), id, "/deactivate");
        assertNotFound(post(id + "/reactivate", COACH_EMAIL), id, "/reactivate");
        assertNotFound(unlink(id.toString(), COACH_EMAIL), id, "/unlink");
        // Reactivar no lo restaura
        assertEquals(Boolean.FALSE, jdbcTemplate.queryForObject("select active from users where id = ?",
                Boolean.class, id));
    }

    @Test
    void shouldFreeTheEmailOfADeletedAthleteForANewAthlete() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        assertEquals(HttpStatus.NO_CONTENT, delete(leo.getId().toString(), COACH_EMAIL).getStatusCode());

        // Act: alta nueva con el mismo email (en otras mayúsculas)
        ResponseEntity<String> response = postAsCoach(createAthleteRequest("LEO@test.com"));

        // Assert: es otro atleta; la fila eliminada sigue en la base
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        String newId = json(response).get("id").asString();
        assertNotEquals(leo.getId().toString(), newId);
        assertEquals(2, jdbcTemplate.queryForObject("select count(*) from users where lower(email) = 'leo@test.com'",
                Integer.class));
        assertEquals(List.of("leo@test.com"), emails(json(list("", COACH_EMAIL))));
        // El login entra con el atleta nuevo
        assertEquals(HttpStatus.OK, get(newId, "leo@test.com").getStatusCode());
    }

    @Test
    void shouldFreeTheEmailOfADeletedAthleteForAnUpdate() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        Athlete mia = saveAthlete("mia@test.com", coach);
        assertEquals(HttpStatus.NO_CONTENT, delete(leo.getId().toString(), COACH_EMAIL).getStatusCode());

        // Act
        ResponseEntity<String> response = put(mia.getId().toString(), updateAthleteRequest("leo@test.com"),
                COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("leo@test.com", json(response).get("email").asString());
    }

    @Test
    void shouldDeleteAnInactiveAthlete() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        assertEquals(HttpStatus.OK, post(leo.getId() + "/deactivate", COACH_EMAIL).getStatusCode());

        // Act + Assert
        assertEquals(HttpStatus.NO_CONTENT, delete(leo.getId().toString(), COACH_EMAIL).getStatusCode());
        assertEquals(0, emails(json(list("", COACH_EMAIL))).size());
    }

    @Test
    void shouldReturn404WhenDeletingAnAthleteThatDoesNotExist() {
        // Arrange
        UUID missing = UUID.randomUUID();

        // Act + Assert
        assertNotFound(delete(missing.toString(), COACH_EMAIL), missing);
    }

    @Test
    void shouldReturn403AndNotDeleteAnAthleteOfAnotherCoachOrAnUnlinkedOne() {
        // Arrange
        Athlete teo = saveAthlete("teo@test.com", saveCoach("bruno@test.com"));
        Athlete ema = saveAthlete("ema@test.com", null);

        // Act + Assert
        assertForbidden(delete(teo.getId().toString(), COACH_EMAIL), teo);
        assertForbidden(delete(ema.getId().toString(), COACH_EMAIL), ema);
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from users where deleted_at is not null",
                Integer.class));
        assertEquals(HttpStatus.OK, login("teo@test.com").getStatusCode());
    }

    @Test
    void shouldReturn400WhenDeletingWithAnIdThatIsNotAUuid() {
        assertEquals(HttpStatus.BAD_REQUEST, delete("no-es-un-uuid", COACH_EMAIL).getStatusCode());
    }

    // ---------- autenticación de los endpoints de US-07 ----------

    @Test
    void shouldReturn401ForTheUs07EndpointsWithoutTokenOrWithAnInvalidToken() {
        // Arrange
        Athlete leo = saveAthlete("leo@test.com", coach);
        String id = leo.getId().toString();

        // Act + Assert: sin token y con un token que no es un JWT válido
        for (String token : Arrays.asList(null, "no-es-un-jwt")) {
            assertUnauthorizedRequest(exchange(HttpMethod.PUT, id, updateAthleteRequest("x@test.com"), null, token));
            assertUnauthorizedRequest(exchange(HttpMethod.DELETE, id, null, null, token));
            assertUnauthorizedRequest(exchange(HttpMethod.PATCH, id + "/unlink", null, null, token));
            assertUnauthorizedRequest(exchange(HttpMethod.POST, id + "/deactivate", null, null, token));
            assertUnauthorizedRequest(exchange(HttpMethod.POST, id + "/reactivate", null, null, token));
        }
        // Nada cambió
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from users where deleted_at is not null",
                Integer.class));
        assertEquals(coach.getId().toString(), json(get(id, COACH_EMAIL)).get("coachId").asString());
        assertEquals("leo@test.com", json(get(id, COACH_EMAIL)).get("email").asString());
    }

    @Test
    void shouldReturn403WhenAnAthleteTriesToModifyItselfOrAnotherAthlete() {
        // Arrange: un atleta sobre sí mismo y sobre otra atleta del mismo entrenador
        Athlete leo = saveAthlete("leo@test.com", coach);
        Athlete mia = saveAthlete("mia@test.com", coach);

        // Act + Assert
        for (Athlete target : List.of(leo, mia)) {
            String id = target.getId().toString();
            assertEquals(HttpStatus.FORBIDDEN,
                    put(id, updateAthleteRequest("x@test.com"), "leo@test.com").getStatusCode());
            assertEquals(HttpStatus.FORBIDDEN, delete(id, "leo@test.com").getStatusCode());
            assertEquals(HttpStatus.FORBIDDEN, unlink(id, "leo@test.com").getStatusCode());
            assertEquals(HttpStatus.FORBIDDEN, post(id + "/deactivate", "leo@test.com").getStatusCode());
            assertEquals(HttpStatus.FORBIDDEN, post(id + "/reactivate", "leo@test.com").getStatusCode());
        }
        // Nada cambió (siguen vinculados al entrenador y sin eliminar)
        assertEquals(2, emails(json(list("", COACH_EMAIL))).size());
        assertEquals(0, jdbcTemplate.queryForObject("select count(*) from users where not active", Integer.class));
    }

    @Test
    void shouldReturn403WhenTheBodyIsInvalidButTheCallerIsAnAthlete() {
        // Arrange: la regla de rol corre antes de validar el body
        Athlete leo = saveAthlete("leo@test.com", coach);

        // Act
        ResponseEntity<String> response = put(leo.getId().toString(), "{}", "leo@test.com");

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    private ResponseEntity<String> put(String id, Object body, String email) {
        return exchange(HttpMethod.PUT, id, body, email, null);
    }

    private ResponseEntity<String> post(String subpath, String email) {
        return exchange(HttpMethod.POST, subpath, null, email, null);
    }

    private ResponseEntity<String> unlink(String id, String email) {
        return exchange(HttpMethod.PATCH, id + "/unlink", null, email, null);
    }

    private ResponseEntity<String> delete(String id, String email) {
        return exchange(HttpMethod.DELETE, id, null, email, null);
    }

    // Request a /api/athletes/{subpath} con la sesión de ese email, o con un token fijo (ambos null = sin token)
    private ResponseEntity<String> exchange(HttpMethod method, String subpath, Object body, String email,
                                            String token) {
        RestClient.RequestBodySpec request = client.method(method)
                .uri(PATH + "/" + subpath)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    } else if (token != null) {
                        headers.setBearerAuth(token);
                    }
                });
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON)
                    .body(body instanceof String raw ? raw : jsonMapper.writeValueAsString(body));
        }
        return request.retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> login(String email) {
        return client.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", email, "password", RAW_PASSWORD))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private ResponseEntity<String> refresh(String refreshToken) {
        return client.post()
                .uri("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refreshToken", refreshToken))
                .retrieve()
                .onStatus(status -> true, (req, res) -> {
                })
                .toEntity(String.class);
    }

    private void assertAccountDisabled(ResponseEntity<String> response) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(AccountDisabledException.MESSAGE, json(response).get("message").asString());
        assertFalse(response.getBody().contains("accessToken"));
    }

    private void assertNotFound(ResponseEntity<String> response, UUID missing) {
        assertNotFound(response, missing, "");
    }

    private void assertNotFound(ResponseEntity<String> response, UUID missing, String action) {
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(404, body.get("status").asInt());
        assertEquals("No existe el atleta con id " + missing, body.get("message").asString());
        assertEquals(PATH + "/" + missing + action, body.get("path").asString());
    }

    private void assertUnauthorizedRequest(ResponseEntity<String> response) {
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
        assertForbidden(response, requested, "");
    }

    // action: sufijo del path después del id (ej. "/deactivate")
    private void assertForbidden(ResponseEntity<String> response, Athlete requested, String action) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(403, body.get("status").asInt());
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertEquals(PATH + "/" + requested.getId() + action, body.get("path").asString());
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
