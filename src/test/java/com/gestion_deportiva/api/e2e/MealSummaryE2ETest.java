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

// Resumen nutricional del día (US-24, contrato 16): totales, contadores, rol y pertenencia. Las comidas se cargan con
// el repositorio, sin pasar por el alta (eso lo prueba MealE2ETest). Las fechas son pasadas y fijas, salvo las que
// prueban "hoy" y "futuro", que se calculan en la zona de la app. Sin @Transactional: la request corre en otro hilo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class MealSummaryE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";
    private static final String UNLINKED_ATHLETE_EMAIL = "ines@test.com";
    private static final String THIRD_ATHLETE_EMAIL = "teo@test.com";

    private static final LocalDate JAN_11 = LocalDate.of(2026, 1, 11);
    private static final LocalDate JAN_12 = LocalDate.of(2026, 1, 12);
    private static final String DAY_QUERY = "?date=2026-01-12";
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

    private Coach coach;

    private Coach otherCoach;

    // Leo y Mia son atletas de Ana; Teo es de Bruno; Ines está desvinculada
    private Athlete leo;

    private Athlete mia;

    private Athlete teo;

    private Athlete ines;

    // Pollo: 165 kcal, 31 g de proteínas, 0 de hidratos, 3.6 de grasas por 100 g. Arroz: 130, 2.7, 28 y 0.3
    private Food chicken;

    private Food rice;

    @BeforeEach
    void setUp() {
        client = RestClient.create("http://localhost:" + port);
        coach = saveCoach(COACH_EMAIL);
        otherCoach = saveCoach(OTHER_COACH_EMAIL);
        leo = saveAthlete(ATHLETE_EMAIL, coach);
        mia = saveAthlete(OTHER_ATHLETE_EMAIL, coach);
        teo = saveAthlete(THIRD_ATHLETE_EMAIL, otherCoach);
        ines = saveAthlete(UNLINKED_ATHLETE_EMAIL, null);
        chicken = saveFood("Pollo resumen", "165", "31", "0", "3.6");
        rice = saveFood("Arroz resumen", "130", "2.7", "28", "0.3");
    }

    // Sin @Transactional: se limpia a mano. CASCADE vacía users (con sus comidas) y foods (con sus meal_items)
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
        jdbcTemplate.execute("TRUNCATE foods CASCADE");
    }

    // Contrato 16.3: almuerzo de 150 g de pollo y 200 g de arroz (507.50 kcal, 51.90 g de proteínas, 56.00 de hidratos
    // y 6.00 de grasas), más una comida solo con descripción, que cuenta pero no suma. La comida de Mia no entra
    @Test
    void shouldSummarizeTheDayWithTheTotalsOfTheItemsAndCountTheMealWithoutNutrition() {
        saveMeal(leo, JAN_12, LUNCH, null, item(chicken, "150"), item(rice, "200"));
        saveMeal(leo, JAN_12, DINNER, "Cena sin datos");
        saveMeal(mia, JAN_12, LUNCH, "De Mia", item(chicken, "150"));

        ResponseEntity<String> response = summary(leo.getId(), DAY_QUERY, ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("2026-01-12", body.get("date").asString());
        assertDecimal("507.50", body.get("caloriesKcal"));
        assertDecimal("51.90", body.get("proteinG"));
        assertDecimal("56.00", body.get("carbsG"));
        assertDecimal("6.00", body.get("fatG"));
        assertEquals(2, body.get("mealCount").asLong());
        assertEquals(1, body.get("mealsWithoutNutrition").asLong());
    }

    // Contrato 16.3: un día sin comidas responde 200 con todo en cero, no 404
    @Test
    void shouldAnswerZerosForADayWithoutMeals() {
        ResponseEntity<String> response = summary(leo.getId(), DAY_QUERY, ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertDecimal("0", body.get("caloriesKcal"));
        assertDecimal("0", body.get("proteinG"));
        assertDecimal("0", body.get("carbsG"));
        assertDecimal("0", body.get("fatG"));
        assertEquals(0, body.get("mealCount").asLong());
        assertEquals(0, body.get("mealsWithoutNutrition").asLong());
    }

    // Sin ?date, el resumen es el de hoy en la zona de la app
    @Test
    void shouldSummarizeTodayWhenNoDateIsGiven() {
        saveMeal(leo, today(), LUNCH, null, item(chicken, "100"));
        saveMeal(leo, JAN_11, LUNCH, null, item(chicken, "100"));

        ResponseEntity<String> response = summary(leo.getId(), "", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(today().toString(), json(response).get("date").asString());
        assertDecimal("165", json(response).get("caloriesKcal"));
        assertEquals(1, json(response).get("mealCount").asLong());
    }

    // Leer un día futuro no es error: sin comidas, todo en cero (contrato 16.3)
    @Test
    void shouldAnswerZerosForAFutureDate() {
        ResponseEntity<String> response = summary(leo.getId(), "?date=" + today().plusDays(1), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertDecimal("0", json(response).get("caloriesKcal"));
        assertEquals(0, json(response).get("mealCount").asLong());
    }

    // Contrato 16.5: la fecha con otro formato va en fieldErrors, igual que el listado
    @Test
    void shouldReturn400OnTheDateFieldWhenTheDateHasAnotherFormat() {
        ResponseEntity<String> response = summary(leo.getId(), "?date=2026/01/12", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(json(response).get("fieldErrors").toString().contains("\"field\":\"date\""));
    }

    @Test
    void shouldReturn400WhenTheAthleteIdIsNotAUuid() {
        ResponseEntity<String> response = exchange("/api/athletes/no-es-uuid/meals/summary", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // El entrenador ve el resumen de sus atletas (el de Leo, no el de Teo)
    @Test
    void shouldLetTheCoachSeeTheSummaryOfHisAthlete() {
        saveMeal(leo, JAN_12, LUNCH, null, item(chicken, "150"));
        saveMeal(teo, JAN_12, LUNCH, null, item(rice, "200"));

        ResponseEntity<String> response = summary(leo.getId(), DAY_QUERY, COACH_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertDecimal("247.50", json(response).get("caloriesKcal"));
    }

    @Test
    void shouldReturn403WhenTheCoachSummarizesAnAthleteOfAnotherCoach() {
        saveMeal(teo, JAN_12, LUNCH, null, item(rice, "200"));

        ResponseEntity<String> response = summary(teo.getId(), DAY_QUERY, COACH_EMAIL);

        assertAthleteForbidden(response, teo);
        assertFalse(response.getBody().contains("caloriesKcal"));
    }

    @Test
    void shouldReturn403WhenTheCoachSummarizesAnUnlinkedAthlete() {
        assertAthleteForbidden(summary(ines.getId(), DAY_QUERY, COACH_EMAIL), ines);
    }

    @Test
    void shouldReturn403WhenAnAthleteSummarizesAnotherAthlete() {
        assertAthleteForbidden(summary(mia.getId(), DAY_QUERY, ATHLETE_EMAIL), mia);
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = summary(missing, DAY_QUERY, COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
    }

    @Test
    void shouldReturn401WhenSummarizingWithoutToken() {
        ResponseEntity<String> response = exchange(path(leo.getId()) + DAY_QUERY, null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    // ---------- helpers ----------

    private ResponseEntity<String> summary(UUID athleteId, String query, String email) {
        return exchange(path(athleteId) + query, email);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/meals/summary";
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

    // owner null = atleta desvinculado
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
