package com.gestion_deportiva.api.e2e;

import com.gestion_deportiva.api.TestcontainersConfiguration;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
import com.gestion_deportiva.api.meal.exception.MealRangeTooLongException;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.MealItem;
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
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.meal.model.enums.MealType.DINNER;
import static com.gestion_deportiva.api.meal.model.enums.MealType.LUNCH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.MealFixtures.item;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Alimentación por rango (US-25): un resumen por día (también los días vacíos), la constancia de registro, el rango
// por defecto, los 400 del rango, rol y pertenencia. Las comidas se cargan
// con el repositorio. Sin @Transactional: la request corre en otro hilo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class MealOverviewE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";
    private static final String THIRD_ATHLETE_EMAIL = "teo@test.com";

    private static final LocalDate JAN_12 = LocalDate.of(2026, 1, 12);
    private static final LocalDate JAN_14 = LocalDate.of(2026, 1, 14);
    private static final String WEEK_QUERY = "?from=2026-01-12&to=2026-01-18";
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
    private MealRepository mealRepository;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private TimeZoneProperties timeZoneProperties;

    private RestClient client;

    // Leo y Mia son atletas de Ana; Teo es de Bruno
    private Athlete leo;

    private Athlete mia;

    private Athlete teo;

    // Pollo: 165 kcal, 31 g de proteínas, 0 de hidratos, 3.6 de grasas por 100 g. Arroz: 130, 2.7, 28 y 0.3
    private Food chicken;

    private Food rice;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        Coach ana = saveCoach(COACH_EMAIL);
        Coach bruno = saveCoach(OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, ana);
        mia = saveAthlete(OTHER_ATHLETE_EMAIL, ana);
        teo = saveAthlete(THIRD_ATHLETE_EMAIL, bruno);
        chicken = saveFood("Pollo semana", "165", "31", "0", "3.6");
        rice = saveFood("Arroz semana", "130", "2.7", "28", "0.3");
    }

    // Sin @Transactional: se limpia a mano. CASCADE vacía users (con sus comidas) y foods (con sus meal_items)
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
        jdbcTemplate.execute("TRUNCATE foods CASCADE");
    }

    // Semana del 12 al 18: comidas el 12 (almuerzo con ítems revisado + cena sin datos) y el 14. Los demás días van
    // en cero y la constancia es 2 de 7. Lo de Mia no entra
    @Test
    void shouldAnswerOneSummaryPerDayWithTheConsistency() {
        Meal lunch = meal(leo, JAN_12, LUNCH, null, item(chicken, "150"), item(rice, "200"));
        lunch.review(Instant.parse("2026-01-12T20:00:00Z"), "Bien");
        mealRepository.saveAndFlush(lunch);
        saveMeal(leo, JAN_12, DINNER, "Cena sin datos");
        saveMeal(leo, JAN_14, LUNCH, null, item(chicken, "100"));
        saveMeal(mia, JAN_12, LUNCH, "De Mia", item(chicken, "150"));

        ResponseEntity<String> response = overview(leo.getId(), WEEK_QUERY, COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("2026-01-12", body.get("from").asString());
        assertEquals("2026-01-18", body.get("to").asString());
        assertEquals(7, body.get("totalDays").asInt());
        assertEquals(2, body.get("daysWithMeals").asInt());
        JsonNode days = body.get("days");
        assertEquals(7, days.size());
        assertEquals("2026-01-12", days.get(0).get("date").asString());
        assertDecimal("507.50", days.get(0).get("caloriesKcal"));
        assertDecimal("51.90", days.get(0).get("proteinG"));
        assertEquals(2, days.get(0).get("mealCount").asLong());
        assertEquals(1, days.get(0).get("mealsWithoutNutrition").asLong());
        assertEquals("2026-01-13", days.get(1).get("date").asString());
        assertDecimal("0", days.get(1).get("caloriesKcal"));
        assertEquals(0, days.get(1).get("mealCount").asLong());
        assertDecimal("165", days.get(2).get("caloriesKcal"));
        assertEquals("2026-01-18", days.get(6).get("date").asString());
    }

    // Sin registros: estado vacío, todos los días en cero (no 404)
    @Test
    void shouldAnswerEveryDayInZeroWhenThereAreNoMeals() {
        ResponseEntity<String> response = overview(leo.getId(), WEEK_QUERY, ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(0, body.get("daysWithMeals").asInt());
        assertFalse(body.has("pendingReviewMeals"));
        assertEquals(7, body.get("days").size());
    }

    // Sin fechas: los últimos 7 días hasta hoy en la zona de la app
    @Test
    void shouldUseTheLastSevenDaysUntilTodayWhenNoDateIsGiven() {
        saveMeal(leo, today(), LUNCH, null, item(chicken, "100"));

        ResponseEntity<String> response = overview(leo.getId(), "", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(today().minusDays(6).toString(), body.get("from").asString());
        assertEquals(today().toString(), body.get("to").asString());
        assertEquals(1, body.get("daysWithMeals").asInt());
        assertDecimal("165", body.get("days").get(6).get("caloriesKcal"));
    }

    // Un solo día (from = to) es la vista "día"
    @Test
    void shouldAcceptASingleDay() {
        saveMeal(leo, JAN_12, LUNCH, null, item(chicken, "100"));

        JsonNode body = json(overview(leo.getId(), "?from=2026-01-12&to=2026-01-12", COACH_EMAIL));

        assertEquals(1, body.get("totalDays").asInt());
        assertEquals(1, body.get("daysWithMeals").asInt());
    }

    // ---------- rango inválido: 400 ----------

    @Test
    void shouldReturn400OnFromWhenFromIsAfterTo() {
        ResponseEntity<String> response = overview(leo.getId(), "?from=2026-01-18&to=2026-01-12", COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(json(response).get("fieldErrors").toString().contains("\"field\":\"from\""));
    }

    @Test
    void shouldReturn400OnToWhenTheRangeExceeds31Days() {
        ResponseEntity<String> response = overview(leo.getId(), "?from=2026-01-01&to=2026-02-01", COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode error = json(response).get("fieldErrors").get(0);
        assertEquals("to", error.get("field").asString());
        assertEquals(MealRangeTooLongException.MESSAGE, error.get("message").asString());
    }

    @Test
    void shouldReturn400WhenADateHasAnotherFormat() {
        ResponseEntity<String> response = overview(leo.getId(), "?from=12-01-2026", COACH_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(json(response).get("fieldErrors").toString().contains("\"field\":\"from\""));
    }

    // ---------- rol y pertenencia ----------

    @Test
    void shouldReturn403WhenTheCoachAsksForAnAthleteOfAnotherCoach() {
        saveMeal(teo, JAN_12, LUNCH, null, item(rice, "200"));

        ResponseEntity<String> response = overview(teo.getId(), WEEK_QUERY, COACH_EMAIL);

        assertAthleteForbidden(response, teo);
        assertFalse(response.getBody().contains("caloriesKcal"));
    }

    @Test
    void shouldReturn403WhenAnAthleteAsksForAnotherAthlete() {
        assertAthleteForbidden(overview(mia.getId(), WEEK_QUERY, ATHLETE_EMAIL), mia);
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = overview(missing, WEEK_QUERY, COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
    }

    @Test
    void shouldReturn401WithoutToken() {
        ResponseEntity<String> response = exchange(path(leo.getId()) + WEEK_QUERY, null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    // ---------- helpers ----------

    private ResponseEntity<String> overview(UUID athleteId, String query, String email) {
        return exchange(path(athleteId) + query, email);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/meals/overview";
    }

    // Request con la sesión de ese email; null = sin token
    private ResponseEntity<String> exchange(String uri, String email) {
        return client.method(HttpMethod.GET)
                .uri(uri)
                .headers(headers -> {
                    if (email != null) {
                        AuthHeaders.authenticate(headers, client, email, RAW_PASSWORD);
                    }
                })
                .retrieve()
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

    // Compara el número por valor: "507.50" y 507.5 son iguales
    private static void assertDecimal(String expected, JsonNode actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual.decimalValue()),
                "esperado " + expected + " pero fue " + actual);
    }

    // 403 de pertenencia (AthleteAccessGuard)
    private void assertAthleteForbidden(ResponseEntity<String> response, Athlete requested) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertTrue(body.get("path").asString().startsWith(path(requested.getId())));
    }

    private Coach saveCoach(String email) {
        return coachRepository.saveAndFlush(new Coach("Ana", "Paz", email, passwordEncoder.encode(RAW_PASSWORD)));
    }

    private Athlete saveAthlete(String email, Coach owner) {
        return athleteRepository.saveAndFlush(
                new Athlete("Leo", "Gil", email, passwordEncoder.encode(RAW_PASSWORD), owner));
    }

    private Food saveFood(String name, String caloriesKcal, String proteinG, String carbsG, String fatG) {
        return foodRepository.saveAndFlush(Food.builder()
                .name(name)
                .referencePortionG(new BigDecimal("100"))
                .caloriesKcal(new BigDecimal(caloriesKcal))
                .proteinG(new BigDecimal(proteinG))
                .carbsG(new BigDecimal(carbsG))
                .fatG(new BigDecimal(fatG))
                .build());
    }

    private Meal saveMeal(Athlete athlete, LocalDate date, MealType type, String description, MealItem... items) {
        return mealRepository.saveAndFlush(meal(athlete, date, type, description, items));
    }
}
