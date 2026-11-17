package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import com.gestion_deportiva.api.meal.repository.MealRepository;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Revisión del entrenador sobre una comida (US-25): comentario recortado, revisar sin texto o de nuevo, la edición del
// atleta que descarta la revisión, rol y pertenencia. Sin @Transactional: la request corre en otro hilo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class MealReviewE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";

    private static final LocalDate JAN_12 = LocalDate.of(2026, 1, 12);
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
    private MealRepository mealRepository;

    private RestClient client;

    // Leo y Mia son atletas de Ana; Bruno no entrena a ninguno
    private Athlete leo;

    private Athlete mia;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        Coach ana = saveCoach(COACH_EMAIL);
        saveCoach(OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, ana);
        mia = saveAthlete(OTHER_ATHLETE_EMAIL, ana);
    }

    // Sin @Transactional: se limpia a mano. CASCADE vacía users con sus comidas
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
    }

    // ---------- revisar: 200 ----------

    @Test
    void shouldReviewTheMealWithTheTrimmedObservationAndShowItToTheAthlete() {
        Meal lunch = saveMeal(leo, "Milanesa");
        Instant before = Instant.now().minusSeconds(1);

        // Act
        ResponseEntity<String> response = review(reviewPath(leo, lunch), "{\"observation\": \"  Sumá verduras  \"}",
                COACH_EMAIL);

        // Assert: 200 con la comida y su revisión; la base la guardó recortada
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(lunch.getId().toString(), body.get("id").asString());
        assertEquals("Sumá verduras", body.get("review").get("observation").asString());
        Instant reviewedAt = Instant.parse(body.get("review").get("reviewedAt").asString());
        assertFalse(reviewedAt.isBefore(before));
        assertFalse(reviewedAt.isAfter(Instant.now()));
        assertEquals("Sumá verduras", observationOf(lunch.getId()));

        // Assert: el atleta ve la revisión en el listado del día
        JsonNode day = json(exchange(HttpMethod.GET, mealsPath(leo) + "?date=" + JAN_12, null, ATHLETE_EMAIL));
        assertEquals("Sumá verduras", day.get(0).get("review").get("observation").asString());
    }

    // Una comida sin revisar muestra review en null (no un objeto vacío)
    @Test
    void shouldShowANullReviewForAnUnreviewedMeal() {
        saveMeal(leo, "Milanesa");

        JsonNode day = json(exchange(HttpMethod.GET, mealsPath(leo) + "?date=" + JAN_12, null, COACH_EMAIL));

        assertTrue(day.get(0).get("review").isNull());
    }

    @Test
    void shouldReviewWithoutObservationWithoutBodyOrWithABlankOne() {
        Meal withoutBody = saveMeal(leo, "Sin body");
        Meal blank = saveMeal(leo, "En blanco");

        // Act
        JsonNode empty = json(review(reviewPath(leo, withoutBody), null, COACH_EMAIL));
        JsonNode spaces = json(review(reviewPath(leo, blank), "{\"observation\": \"   \"}", COACH_EMAIL));

        // Assert: revisadas, con observación null
        assertNotNull(empty.get("review"));
        assertTrue(empty.get("review").get("observation").isNull());
        assertTrue(spaces.get("review").get("observation").isNull());
        assertTrue(isReviewed(withoutBody.getId()));
    }

    @Test
    void shouldReplaceTheObservationWhenReviewedAgain() {
        Meal lunch = saveMeal(leo, "Milanesa");
        assertEquals(HttpStatus.OK,
                review(reviewPath(leo, lunch), "{\"observation\": \"Primera\"}", COACH_EMAIL).getStatusCode());

        ResponseEntity<String> again = review(reviewPath(leo, lunch), "{\"observation\": \"Segunda\"}", COACH_EMAIL);

        assertEquals(HttpStatus.OK, again.getStatusCode());
        assertEquals("Segunda", json(again).get("review").get("observation").asString());
        assertEquals("Segunda", observationOf(lunch.getId()));
    }

    // La revisión era sobre los datos anteriores: si el atleta edita la comida, vuelve a quedar pendiente
    @Test
    void shouldDiscardTheReviewWhenTheAthleteEditsTheMeal() {
        Meal lunch = saveMeal(leo, "Milanesa");
        review(reviewPath(leo, lunch), "{\"observation\": \"Sumá verduras\"}", COACH_EMAIL);

        ResponseEntity<String> edited = exchange(HttpMethod.PUT, mealsPath(leo) + "/" + lunch.getId(),
                "{\"date\": \"2026-01-12\", \"type\": \"LUNCH\", \"description\": \"Milanesa con ensalada\"}",
                ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, edited.getStatusCode());
        assertTrue(json(edited).get("review").isNull());
        assertFalse(isReviewed(lunch.getId()));
    }

    @Test
    void shouldAcceptAnObservationOfExactlyAThousandCharacters() {
        Meal lunch = saveMeal(leo, "Milanesa");
        String text = "a".repeat(1000);

        ResponseEntity<String> response = review(reviewPath(leo, lunch),
                jsonMapper.writeValueAsString(Map.of("observation", text)), COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(text, json(response).get("review").get("observation").asString());
    }

    // ---------- errores ----------

    @Test
    void shouldReturn400WhenTheObservationExceeds1000CharactersAndLeaveTheMealUnreviewed() {
        Meal lunch = saveMeal(leo, "Milanesa");

        ResponseEntity<String> response = review(reviewPath(leo, lunch),
                jsonMapper.writeValueAsString(Map.of("observation", "a".repeat(1001))), COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(VALIDATION_MESSAGE, body.get("message").asString());
        assertEquals("observation", body.get("fieldErrors").get(0).get("field").asString());
        assertEquals("El comentario no puede superar los 1000 caracteres",
                body.get("fieldErrors").get(0).get("message").asString());
        assertFalse(isReviewed(lunch.getId()));
    }

    @Test
    void shouldReturn403ForTheAthleteEvenOnHisOwnMeal() {
        Meal lunch = saveMeal(leo, "Milanesa");

        ResponseEntity<String> response = review(reviewPath(leo, lunch), "{\"observation\": \"Mía\"}",
                ATHLETE_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        assertFalse(isReviewed(lunch.getId()));
    }

    @Test
    void shouldReturn403ForACoachWhoDoesNotCoachTheAthlete() {
        Meal lunch = saveMeal(leo, "Milanesa");

        ResponseEntity<String> response = review(reviewPath(leo, lunch), "{}", OTHER_COACH_EMAIL);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ATHLETE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
        assertFalse(isReviewed(lunch.getId()));
    }

    // La comida es de Mia; se pide por la ruta de Leo, del mismo entrenador
    @Test
    void shouldReturn404WhenTheMealBelongsToAnotherAthlete() {
        Meal miasMeal = saveMeal(mia, "De Mia");

        ResponseEntity<String> response = review(reviewPath(leo, miasMeal), "{}", COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe la comida con id " + miasMeal.getId(), json(response).get("message").asString());
        assertFalse(isReviewed(miasMeal.getId()));
    }

    @Test
    void shouldReturn404WhenTheMealDoesNotExist() {
        String unknown = mealsPath(leo) + "/" + UUID.randomUUID() + "/review";

        assertEquals(HttpStatus.NOT_FOUND, review(unknown, "{}", COACH_EMAIL).getStatusCode());
    }

    @Test
    void shouldReturn401WithoutToken() {
        Meal lunch = saveMeal(leo, "Milanesa");

        ResponseEntity<String> response = review(reviewPath(leo, lunch), "{}", null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
        assertFalse(isReviewed(lunch.getId()));
    }

    // ---------- helpers ----------

    private static String mealsPath(Athlete athlete) {
        return "/api/athletes/" + athlete.getId() + "/meals";
    }

    private static String reviewPath(Athlete athlete, Meal meal) {
        return mealsPath(athlete) + "/" + meal.getId() + "/review";
    }

    private ResponseEntity<String> review(String uri, String rawBody, String email) {
        return exchange(HttpMethod.PUT, uri, rawBody, email);
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

    private String observationOf(UUID mealId) {
        return jdbcTemplate.queryForObject("select coach_observation from meals where id = ?", String.class, mealId);
    }

    private boolean isReviewed(UUID mealId) {
        Boolean reviewed = jdbcTemplate.queryForObject(
                "select reviewed_at is not null from meals where id = ?", Boolean.class, mealId);
        return Boolean.TRUE.equals(reviewed);
    }

    private JsonNode json(ResponseEntity<String> response) {
        return jsonMapper.readTree(response.getBody());
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }

    private Meal saveMeal(Athlete athlete, String description) {
        return mealRepository.saveAndFlush(meal(athlete, JAN_12, MealType.LUNCH, description));
    }
}
