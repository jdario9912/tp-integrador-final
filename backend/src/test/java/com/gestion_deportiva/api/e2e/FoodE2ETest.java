package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.food.dto.FoodRequest;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.FoodFixtures.food;
import static com.gestion_deportiva.api.support.FoodFixtures.foodRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Catálogo de alimentos (US-39). Cada test arma sus propios alimentos: los precargados por la V9 se borran
// antes de cada test para que los listados no dependan de la precarga
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class FoodE2ETest {

    private static final String PATH = "/api/foods";
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
    private FoodRepository foodRepository;

    private RestClient client;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        jdbcTemplate.execute("TRUNCATE foods");
        // Hash BCrypt real: la autenticación valida la contraseña contra la base
        Coach coach = coachRepository.saveAndFlush(
                new Coach("Ana", "Paz", COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        coachRepository.saveAndFlush(
                new Coach("Bruno", "Sosa", OTHER_COACH_EMAIL, passwordEncoder.encode(RAW_PASSWORD)));
        athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", ATHLETE_EMAIL, passwordEncoder.encode(RAW_PASSWORD), coach));
    }

    // Sin @Transactional (la request corre en otro hilo): se limpia a mano
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
        jdbcTemplate.execute("TRUNCATE foods");
    }

    // ---------- alta ----------

    @Test
    void shouldReturn201WithTheFoodAndPersistIt() {
        // Arrange
        FoodRequest request = new FoodRequest(" Pechuga de pollo ", new BigDecimal("100"), new BigDecimal("165"),
                new BigDecimal("31"), BigDecimal.ZERO, new BigDecimal("3.6"));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "", request, COACH_EMAIL);

        // Assert: respuesta (los valores viajan como números JSON)
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        String id = body.get("id").asString();
        assertNotNull(response.getHeaders().getLocation());
        assertTrue(response.getHeaders().getLocation().toString().endsWith(PATH + "/" + id));
        assertEquals("Pechuga de pollo", body.get("name").asString());
        assertTrue(body.get("referencePortionG").isNumber());
        assertEquals(0, new BigDecimal("3.6").compareTo(body.get("fatG").decimalValue()));

        // Assert: base de datos
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select name, calories_kcal, protein_g from foods where id = ?::uuid", id);
        assertEquals("Pechuga de pollo", row.get("name"));
        assertEquals(0, new BigDecimal("165").compareTo((BigDecimal) row.get("calories_kcal")));
        assertEquals(0, new BigDecimal("31").compareTo((BigDecimal) row.get("protein_g")));
    }

    @Test
    void shouldReturn400WithTheInvalidFields() {
        // Act
        ResponseEntity<String> response = exchange(HttpMethod.POST, "",
                new FoodRequest(" ", BigDecimal.ZERO, new BigDecimal("-1"), null, BigDecimal.ONE,
                        new BigDecimal("1.234")), COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Set.of("name", "referencePortionG", "caloriesKcal", "proteinG", "fatG"),
                fieldErrors(response));
        assertEquals(0, count());
    }

    @Test
    void shouldReturn409WhenTheNameAlreadyExistsIgnoringCase() {
        foodRepository.saveAndFlush(food("Arroz"));

        ResponseEntity<String> response = exchange(HttpMethod.POST, "", foodRequest("ARROZ"), OTHER_COACH_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe un alimento llamado ARROZ en el catálogo", json(response).get("message").asString());
        assertEquals(1, count());
    }

    @Test
    void shouldReturn403WhenAnAthleteCreatesOrEditsAFood() {
        // Arrange
        Food existing = foodRepository.saveAndFlush(food("Arroz"));

        // Act
        ResponseEntity<String> created = exchange(HttpMethod.POST, "", foodRequest("Avena"), ATHLETE_EMAIL);
        ResponseEntity<String> updated = exchange(HttpMethod.PUT, existing.getId().toString(),
                foodRequest("Avena"), ATHLETE_EMAIL);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, created.getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, updated.getStatusCode());
        assertEquals(List.of("Arroz"), jdbcTemplate.queryForList("select name from foods", String.class));
    }

    @Test
    void shouldReturn401WithoutToken() {
        assertEquals(HttpStatus.UNAUTHORIZED, exchange(HttpMethod.GET, "", null, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED,
                exchange(HttpMethod.POST, "", foodRequest("Arroz"), null).getStatusCode());
    }

    // ---------- consulta ----------

    @Test
    void shouldListSortedByNameForCoachesAndAthletes() {
        foodRepository.saveAllAndFlush(List.of(food("Banana"), food("Arroz"), food("Clara de huevo")));

        JsonNode asCoach = json(exchange(HttpMethod.GET, "", null, COACH_EMAIL));
        JsonNode asAthlete = json(exchange(HttpMethod.GET, "", null, ATHLETE_EMAIL));

        assertEquals(List.of("Arroz", "Banana", "Clara de huevo"), names(asCoach));
        assertEquals(List.of("Arroz", "Banana", "Clara de huevo"), names(asAthlete));
        assertEquals(3, asAthlete.get("totalElements").asInt());
    }

    @Test
    void shouldFilterByNameAndPaginateIgnoringTheClientSort() {
        // Arrange
        foodRepository.saveAllAndFlush(List.of(food("Arroz blanco"), food("Arroz integral"), food("Avena"),
                food("Galletas de arroz")));

        // Act
        JsonNode filtered = json(exchange(HttpMethod.GET, "?name=ARROZ", null, ATHLETE_EMAIL));
        JsonNode secondPage = json(exchange(HttpMethod.GET, "?name=arroz&page=1&size=2&sort=name,desc",
                null, COACH_EMAIL));

        // Assert
        assertEquals(List.of("Arroz blanco", "Arroz integral", "Galletas de arroz"), names(filtered));
        assertEquals(List.of("Galletas de arroz"), names(secondPage));
        assertEquals(3, secondPage.get("totalElements").asInt());
        assertEquals(2, secondPage.get("totalPages").asInt());
    }

    @Test
    void shouldReturn400WhenTheSearchIsTooLong() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, "?name=" + "a".repeat(101), null, COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldReturnAFoodToAnAthleteAnd404ForAnUnknownOne() {
        Food existing = foodRepository.saveAndFlush(food("Arroz"));

        ResponseEntity<String> found = exchange(HttpMethod.GET, existing.getId().toString(), null, ATHLETE_EMAIL);
        ResponseEntity<String> missing = exchange(HttpMethod.GET, UUID.randomUUID().toString(), null, COACH_EMAIL);

        assertEquals(HttpStatus.OK, found.getStatusCode());
        assertEquals("Arroz", json(found).get("name").asString());
        assertEquals(HttpStatus.NOT_FOUND, missing.getStatusCode());
    }

    // ---------- edición ----------

    @Test
    void shouldLetAnyCoachUpdateAFood() {
        // Arrange
        Food existing = foodRepository.saveAndFlush(food("Arroz"));
        FoodRequest request = new FoodRequest("Arroz integral", new BigDecimal("50"), new BigDecimal("56"),
                new BigDecimal("1.15"), new BigDecimal("12"), new BigDecimal("0.4"));

        // Act
        ResponseEntity<String> response = exchange(HttpMethod.PUT, existing.getId().toString(), request,
                OTHER_COACH_EMAIL);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Arroz integral", json(response).get("name").asString());
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select name, reference_portion_g, protein_g from foods where id = ?", existing.getId());
        assertEquals("Arroz integral", row.get("name"));
        assertEquals(0, new BigDecimal("50").compareTo((BigDecimal) row.get("reference_portion_g")));
        assertEquals(0, new BigDecimal("1.15").compareTo((BigDecimal) row.get("protein_g")));
    }

    @Test
    void shouldReturn409WhenRenamingToAnotherFoodsName() {
        foodRepository.saveAndFlush(food("Avena"));
        Food existing = foodRepository.saveAndFlush(food("Arroz"));

        ResponseEntity<String> response = exchange(HttpMethod.PUT, existing.getId().toString(),
                foodRequest("avena"), COACH_EMAIL);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void shouldReturn404WhenUpdatingAnUnknownFood() {
        ResponseEntity<String> response = exchange(HttpMethod.PUT, UUID.randomUUID().toString(),
                foodRequest("Arroz"), COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // ---------- helpers ----------

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

    private static List<String> names(JsonNode page) {
        List<String> names = new ArrayList<>();
        page.get("content").forEach(food -> names.add(food.get("name").asString()));
        return names;
    }

    private int count() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from foods", Integer.class);
        return count == null ? 0 : count;
    }
}
