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
import com.gestion_deportiva.api.meal.dto.MealItemRequest;
import com.gestion_deportiva.api.meal.dto.MealRequest;
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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.meal.model.enums.MealType.BREAKFAST;
import static com.gestion_deportiva.api.meal.model.enums.MealType.DINNER;
import static com.gestion_deportiva.api.meal.model.enums.MealType.LUNCH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.MealFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.MealFixtures.item;
import static com.gestion_deportiva.api.support.MealFixtures.itemRequest;
import static com.gestion_deportiva.api.support.MealFixtures.lunchRequest;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static com.gestion_deportiva.api.support.MealFixtures.mealRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Comidas (US-23): alta, edición, borrado y listado del día, con los roles, la pertenencia y los errores del contrato
// (docs/contracts/30-us-23.md, sección 11). Las fechas son pasadas y fijas, salvo las que prueban "hoy" y "mañana",
// que se calculan en la zona de la app. Sin @Transactional: la request corre en otro hilo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class MealE2ETest {

    private static final String COACH_EMAIL = "ana@test.com";
    private static final String OTHER_COACH_EMAIL = "bruno@test.com";
    private static final String ATHLETE_EMAIL = "leo@test.com";
    private static final String OTHER_ATHLETE_EMAIL = "mia@test.com";
    private static final String UNLINKED_ATHLETE_EMAIL = "ines@test.com";
    private static final String THIRD_ATHLETE_EMAIL = "teo@test.com";

    private static final LocalDate JAN_10 = LocalDate.of(2026, 1, 10);
    private static final LocalDate JAN_12 = LocalDate.of(2026, 1, 12);

    private static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    private static final String MALFORMED_BODY_MESSAGE = "El cuerpo de la solicitud no es un JSON válido";
    private static final String ROLE_FORBIDDEN_MESSAGE = "No tiene permisos para acceder a este recurso";
    private static final String UNAUTHORIZED_MESSAGE = "Debe iniciar sesión para acceder a este recurso";
    private static final String NO_DESCRIPTION_OR_ITEMS_MESSAGE = "Cargá una descripción o al menos un alimento";

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
        chicken = saveFood("Pollo e2e", "165", "31", "0", "3.6");
        rice = saveFood("Arroz e2e", "130", "2.7", "28", "0.3");
    }

    // Sin @Transactional: se limpia a mano. CASCADE vacía users (y con él athletes, meals y meal_items) y foods
    // (con sus meal_items). Los alimentos de la V9 pueden faltar después: FoodRepositoryTest y FoodE2ETest lo toleran
    @AfterEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE users CASCADE");
        jdbcTemplate.execute("TRUNCATE foods CASCADE");
    }

    // ---------- POST /api/athletes/{athleteId}/meals ----------

    // Contrato 11.4: 201 sin Location, calorías por ítem y por comida (150 g de pollo + 200 g de arroz = 507.50)
    @Test
    void shouldReturn201WithTheCaloriesAndPersistTheMealWithItsItems() {
        // Act
        ResponseEntity<String> response = post(leo.getId(), lunchRequest(JAN_10, chicken.getId(), rice.getId()),
                ATHLETE_EMAIL);

        // Assert: respuesta
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNull(response.getHeaders().getLocation());
        JsonNode body = json(response);
        assertEquals("2026-01-10", body.get("date").asString());
        assertEquals("LUNCH", body.get("type").asString());
        assertTrue(body.get("description").isNull());
        assertEquals(0, new BigDecimal("507.50").compareTo(body.get("totalCaloriesKcal").decimalValue()));
        assertEquals(2, body.get("items").size());
        JsonNode first = body.get("items").get(0);
        assertEquals(chicken.getId().toString(), first.get("foodId").asString());
        assertEquals("Pollo e2e", first.get("foodName").asString());
        assertEquals(0, new BigDecimal("247.50").compareTo(first.get("caloriesKcal").decimalValue()));
        assertEquals(0, new BigDecimal("46.50").compareTo(first.get("proteinG").decimalValue()));
        assertEquals(0, new BigDecimal("260.00").compareTo(body.get("items").get(1).get("caloriesKcal").decimalValue()));

        // Assert: base de datos (la copia del alimento y la comida)
        assertEquals(1, countMeals(leo));
        assertEquals(2, countItems(UUID.fromString(body.get("id").asString())));
        assertEquals(1, count("select count(*) from meal_items where food_name = 'Pollo e2e' and ref_protein_g = 31"));
    }

    // Contrato 11.2: solo descripción, sin ítems: totalCaloriesKcal es null, no 0
    @Test
    void shouldAcceptADescriptionOnlyMealWithoutCalories() {
        ResponseEntity<String> response = post(leo.getId(),
                mealRequest(JAN_10, BREAKFAST, "  Café con leche  "), ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("Café con leche", body.get("description").asString());
        assertTrue(body.get("totalCaloriesKcal").isNull());
        assertEquals(0, body.get("items").size());
    }

    @Test
    void shouldReturn403WhenTheCoachRegistersAMealEvenForHisOwnAthlete() {
        ResponseEntity<String> response = post(leo.getId(), mealRequest(JAN_10, LUNCH, "Algo"), COACH_EMAIL);

        assertRoleForbidden(response);
        assertEquals(0, countMeals(leo));
    }

    @Test
    void shouldReturn401WhenRegisteringWithoutToken() {
        assertUnauthorized(post(leo.getId(), mealRequest(JAN_10, LUNCH, "Algo"), null));
    }

    @Test
    void shouldReturn403WhenAnAthleteRegistersForAnotherAthlete() {
        ResponseEntity<String> response = post(mia.getId(), mealRequest(JAN_10, LUNCH, "Algo"), ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
        assertEquals(0, countMeals(mia));
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = post(missing, mealRequest(JAN_10, LUNCH, "Algo"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el atleta con id " + missing, json(response).get("message").asString());
    }

    // Contrato 11.10: los errores de forma se devuelven todos juntos, con el campo de cada uno en fieldErrors
    @Test
    void shouldReturn400WithTheInvalidFieldsAndCreateNothing() {
        MealRequest invalid = new MealRequest(JAN_10, null, "a".repeat(501),
                List.of(new MealItemRequest(null, new BigDecimal("0"))));

        ResponseEntity<String> response = post(leo.getId(), invalid, ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(VALIDATION_MESSAGE, json(response).get("message").asString());
        assertEquals(Set.of("type", "description", "items[0].foodId", "items[0].quantityG"),
                fieldErrors(response).keySet());
        assertEquals(0, countMeals(leo));
    }

    @Test
    void shouldReturn400WhenThereIsNoDescriptionAndNoItems() {
        ResponseEntity<String> response = post(leo.getId(), mealRequest(JAN_10, LUNCH, "   "), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Map.of("items", NO_DESCRIPTION_OR_ITEMS_MESSAGE), fieldErrors(response));
        assertEquals(0, countMeals(leo));
    }

    // La fecha futura se valida con el reloj y la zona de la app, no con la UTC del contenedor
    @Test
    void shouldReturn400WhenTheDateIsInTheFuture() {
        LocalDate tomorrow = today().plusDays(1);

        ResponseEntity<String> response = post(leo.getId(), mealRequest(tomorrow, LUNCH, "Mañana"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Map.of("date", "La fecha no puede ser futura"), fieldErrors(response));
        assertEquals(0, countMeals(leo));
    }

    // Contrato 11.10: un tipo que no existe o una fecha imposible son JSON mal formado (sin fieldErrors)
    @Test
    void shouldReturn400WithoutFieldErrorsForAMalformedBody() {
        ResponseEntity<String> unknownType = post(leo.getId(),
                "{\"date\":\"2026-01-10\",\"type\":\"BRUNCH\",\"description\":\"x\"}", ATHLETE_EMAIL);
        ResponseEntity<String> impossibleDate = post(leo.getId(),
                "{\"date\":\"2026-02-30\",\"type\":\"LUNCH\",\"description\":\"x\"}", ATHLETE_EMAIL);

        for (ResponseEntity<String> response : List.of(unknownType, impossibleDate)) {
            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertEquals(MALFORMED_BODY_MESSAGE, json(response).get("message").asString());
            assertFalse(json(response).hasNonNull("fieldErrors"));
        }
        assertEquals(0, countMeals(leo));
    }

    // Contrato 11.4: si un alimento no existe, no se crea nada (ni la comida ni los ítems anteriores)
    @Test
    void shouldReturn404WhenAFoodDoesNotExistAndCreateNothing() {
        UUID unknownFood = UUID.randomUUID();

        ResponseEntity<String> response = post(leo.getId(), mealRequest(JAN_10, LUNCH, null,
                itemRequest(chicken.getId(), "150"), itemRequest(unknownFood, "100")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el alimento con id " + unknownFood, json(response).get("message").asString());
        assertEquals(0, countMeals(leo));
    }

    // Orden del contrato: primero el body (400) y recién después el atleta (404)
    @Test
    void shouldValidateTheBodyBeforeCheckingTheAthlete() {
        ResponseEntity<String> response = post(UUID.randomUUID(), "{}", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldReturn400WhenTheAthleteIdIsNotAUuid() {
        ResponseEntity<String> response = exchange(HttpMethod.POST, "/api/athletes/no-es-uuid/meals",
                mealRequest(JAN_10, LUNCH, "Algo"), ATHLETE_EMAIL, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // Contrato 11.1: el atleta desvinculado registra sus comidas (son sus datos); su ex entrenador no las ve
    @Test
    void shouldRegisterAMealForAnUnlinkedAthleteAndHideItFromItsFormerCoach() {
        ResponseEntity<String> created = post(ines.getId(), mealRequest(JAN_10, LUNCH, "Ensalada"), UNLINKED_ATHLETE_EMAIL);

        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        assertAthleteForbidden(list(ines.getId(), "?date=2026-01-10", COACH_EMAIL), ines);
    }

    // ---------- PUT /api/athletes/{athleteId}/meals/{mealId} ----------

    // Contrato 11.5: reemplaza todo (los ítems tienen id nuevo), createdAt no cambia y updatedAt sí
    @Test
    void shouldReplaceTheMealAndItsItemsKeepingTheCreationInstant() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"));
        UUID oldItemId = firstItemId(lunch.getId());

        ResponseEntity<String> response = put(leo.getId(), lunch.getId(),
                mealRequest(JAN_12, DINNER, null, itemRequest(rice.getId(), "100")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals("2026-01-12", body.get("date").asString());
        assertEquals("DINNER", body.get("type").asString());
        assertTrue(body.get("description").isNull());
        assertEquals(1, body.get("items").size());
        assertNotEquals(oldItemId.toString(), body.get("items").get(0).get("id").asString());
        assertEquals(0, new BigDecimal("130.00").compareTo(body.get("totalCaloriesKcal").decimalValue()));
        assertEquals(CREATED_AT, Instant.parse(body.get("createdAt").asString()));
        assertNotEquals(CREATED_AT, Instant.parse(body.get("updatedAt").asString()));
        assertEquals(1, countItems(lunch.getId()));
    }

    @Test
    void shouldReturn400AndKeepTheMealWhenTheUpdateIsInvalid() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"));

        ResponseEntity<String> response = put(leo.getId(), lunch.getId(),
                mealRequest(JAN_10, null, "Sin tipo"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Map.of("type", "El tipo de comida es obligatorio"), fieldErrors(response));
        assertMealUnchanged(lunch.getId(), "LUNCH", 1);
    }

    @Test
    void shouldReturn400WhenTheUpdatedDateIsInTheFuture() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"));

        ResponseEntity<String> response = put(leo.getId(), lunch.getId(),
                mealRequest(today().plusDays(1), LUNCH, "Mañana"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(Map.of("date", "La fecha no puede ser futura"), fieldErrors(response));
        assertMealUnchanged(lunch.getId(), "LUNCH", 1);
    }

    // Contrato 11.5 "todo o nada": con un alimento inexistente, la comida no cambia
    @Test
    void shouldReturn404AndKeepTheMealWhenAFoodDoesNotExist() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"));
        UUID unknownFood = UUID.randomUUID();

        ResponseEntity<String> response = put(leo.getId(), lunch.getId(),
                mealRequest(JAN_10, DINNER, "Otra", itemRequest(unknownFood, "100")), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe el alimento con id " + unknownFood, json(response).get("message").asString());
        assertMealUnchanged(lunch.getId(), "LUNCH", 1);
    }

    // La comida de otro atleta responde 404 (solo el dueño sabe si el id existe)
    @Test
    void shouldReturn404WhenTheMealBelongsToAnotherAthlete() {
        Meal miasLunch = saveMeal(mia, JAN_10, LUNCH, "De Mia", item(chicken, "150"));

        ResponseEntity<String> response = put(leo.getId(), miasLunch.getId(),
                mealRequest(JAN_10, DINNER, "Intento"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe la comida con id " + miasLunch.getId(), json(response).get("message").asString());
        assertMealUnchanged(miasLunch.getId(), "LUNCH", 1);
    }

    @Test
    void shouldReturn404WhenTheMealDoesNotExist() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = put(leo.getId(), missing, mealRequest(JAN_10, DINNER, "Algo"), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("No existe la comida con id " + missing, json(response).get("message").asString());
    }

    @Test
    void shouldReturn403WhenTheCoachEditsAMeal() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"));

        ResponseEntity<String> response = put(leo.getId(), lunch.getId(),
                mealRequest(JAN_10, DINNER, "Cambio"), COACH_EMAIL);

        assertRoleForbidden(response);
        assertMealUnchanged(lunch.getId(), "LUNCH", 1);
    }

    @Test
    void shouldReturn403WhenAnAthleteEditsAMealThroughAnotherAthletePath() {
        Meal miasLunch = saveMeal(mia, JAN_10, LUNCH, "De Mia", item(chicken, "150"));

        ResponseEntity<String> response = put(mia.getId(), miasLunch.getId(),
                mealRequest(JAN_10, DINNER, "Intento"), ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
        assertMealUnchanged(miasLunch.getId(), "LUNCH", 1);
    }

    // ---------- DELETE /api/athletes/{athleteId}/meals/{mealId} ----------

    // Contrato 11.6: 204, la comida y sus ítems se borran; un segundo DELETE responde 404
    @Test
    void shouldDeleteTheMealWithItsItemsAndAnswer404TheSecondTime() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"), item(rice, "200"));

        ResponseEntity<String> first = delete(leo.getId(), lunch.getId(), ATHLETE_EMAIL);
        ResponseEntity<String> second = delete(leo.getId(), lunch.getId(), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NO_CONTENT, first.getStatusCode());
        assertNull(first.getBody());
        assertEquals(0, countMeals(leo));
        assertEquals(0, countItems(lunch.getId()));
        assertEquals(HttpStatus.NOT_FOUND, second.getStatusCode());
        assertEquals("No existe la comida con id " + lunch.getId(), json(second).get("message").asString());
    }

    @Test
    void shouldReturn403WhenTheCoachDeletesAMeal() {
        Meal lunch = saveMeal(leo, JAN_10, LUNCH, "Almuerzo", item(chicken, "150"));

        ResponseEntity<String> response = delete(leo.getId(), lunch.getId(), COACH_EMAIL);

        assertRoleForbidden(response);
        assertEquals(1, countMeals(leo));
    }

    @Test
    void shouldReturn403WhenAnAthleteDeletesThroughAnotherAthletePath() {
        Meal miasLunch = saveMeal(mia, JAN_10, LUNCH, "De Mia", item(chicken, "150"));

        ResponseEntity<String> response = delete(mia.getId(), miasLunch.getId(), ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
        assertEquals(1, countMeals(mia));
    }

    @Test
    void shouldReturn404WhenDeletingAMealOfAnotherAthlete() {
        Meal miasLunch = saveMeal(mia, JAN_10, LUNCH, "De Mia", item(chicken, "150"));

        ResponseEntity<String> response = delete(leo.getId(), miasLunch.getId(), ATHLETE_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals(1, countMeals(mia));
    }

    // ---------- GET /api/athletes/{athleteId}/meals ----------

    // Contrato 11.7: por tipo del catálogo (desayuno, almuerzo, cena) y los ítems en su orden de carga
    @Test
    void shouldListTheDayByTypeWithItsItemsInOrder() {
        saveMeal(leo, JAN_12, DINNER, "Cena");
        saveMeal(leo, JAN_12, LUNCH, "Almuerzo", item(rice, "200"), item(chicken, "150"));
        saveMeal(leo, JAN_12, BREAKFAST, "Desayuno");
        saveMeal(mia, JAN_12, LUNCH, "De Mia");
        saveMeal(leo, JAN_10, LUNCH, "Otro día");

        ResponseEntity<String> response = list(leo.getId(), "?date=2026-01-12", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode meals = json(response);
        assertEquals(3, meals.size());
        assertEquals(List.of("BREAKFAST", "LUNCH", "DINNER"), types(meals));
        JsonNode lunch = meals.get(1);
        assertEquals("Arroz e2e", lunch.get("items").get(0).get("foodName").asString());
        assertEquals("Pollo e2e", lunch.get("items").get(1).get("foodName").asString());
        assertEquals(0, new BigDecimal("507.50").compareTo(lunch.get("totalCaloriesKcal").decimalValue()));
    }

    // Sin fecha, el listado es el de hoy en la zona de la app
    @Test
    void shouldListTodayWhenNoDateIsGiven() {
        saveMeal(leo, today(), LUNCH, "De hoy");
        saveMeal(leo, JAN_10, LUNCH, "De otro día");

        ResponseEntity<String> response = list(leo.getId(), "", ATHLETE_EMAIL);

        assertEquals(1, json(response).size());
        assertEquals("De hoy", json(response).get(0).get("description").asString());
    }

    @Test
    void shouldAnswerAnEmptyListWhenThereAreNoMeals() {
        ResponseEntity<String> response = list(leo.getId(), "?date=2026-01-12", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, json(response).size());
    }

    // Contrato 11.7: leer un día futuro no es un error
    @Test
    void shouldAnswerAnEmptyListForAFutureDate() {
        ResponseEntity<String> response = list(leo.getId(), "?date=" + today().plusDays(1), ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, json(response).size());
    }

    @Test
    void shouldReturn400OnTheDateFieldWhenTheDateHasAnotherFormat() {
        ResponseEntity<String> response = list(leo.getId(), "?date=2026/01/12", ATHLETE_EMAIL);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(fieldErrors(response).containsKey("date"));
    }

    @Test
    void shouldReturn400WhenTheAthleteIdIsNotAUuidOnTheList() {
        ResponseEntity<String> response = exchange(HttpMethod.GET, "/api/athletes/no-es-uuid/meals", null,
                ATHLETE_EMAIL, null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldListTheDayForTheCoachOfTheAthleteAndForTheAthlete() {
        saveMeal(leo, JAN_12, LUNCH, "Almuerzo de Leo", item(chicken, "150"));

        ResponseEntity<String> byCoach = list(leo.getId(), "?date=2026-01-12", COACH_EMAIL);
        ResponseEntity<String> byAthlete = list(leo.getId(), "?date=2026-01-12", ATHLETE_EMAIL);

        assertEquals(HttpStatus.OK, byCoach.getStatusCode());
        assertEquals(HttpStatus.OK, byAthlete.getStatusCode());
        assertEquals("Almuerzo de Leo", json(byCoach).get(0).get("description").asString());
    }

    @Test
    void shouldReturn403WhenTheCoachListsAnAthleteOfAnotherCoach() {
        saveMeal(teo, JAN_12, LUNCH, "Secreto de Teo");

        ResponseEntity<String> response = list(teo.getId(), "?date=2026-01-12", COACH_EMAIL);

        assertAthleteForbidden(response, teo);
        assertFalse(response.getBody().contains("Secreto de Teo"));
    }

    @Test
    void shouldReturn403WhenTheCoachListsAnUnlinkedAthlete() {
        ResponseEntity<String> response = list(ines.getId(), "?date=2026-01-12", COACH_EMAIL);

        assertAthleteForbidden(response, ines);
    }

    @Test
    void shouldReturn403WhenAnAthleteListsAnotherAthlete() {
        ResponseEntity<String> response = list(mia.getId(), "?date=2026-01-12", ATHLETE_EMAIL);

        assertAthleteForbidden(response, mia);
    }

    @Test
    void shouldReturn404WhenTheAthleteDoesNotExistOnTheList() {
        UUID missing = UUID.randomUUID();

        ResponseEntity<String> response = list(missing, "?date=2026-01-12", COACH_EMAIL);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void shouldReturn401WhenListingWithoutToken() {
        assertUnauthorized(list(leo.getId(), "?date=2026-01-12", null));
    }

    // ---------- helpers ----------

    private ResponseEntity<String> post(UUID athleteId, Object body, String email) {
        return exchange(HttpMethod.POST, path(athleteId), body, email, null);
    }

    private ResponseEntity<String> put(UUID athleteId, UUID mealId, Object body, String email) {
        return exchange(HttpMethod.PUT, path(athleteId) + "/" + mealId, body, email, null);
    }

    private ResponseEntity<String> delete(UUID athleteId, UUID mealId, String email) {
        return exchange(HttpMethod.DELETE, path(athleteId) + "/" + mealId, null, email, null);
    }

    private ResponseEntity<String> list(UUID athleteId, String query, String email) {
        return exchange(HttpMethod.GET, path(athleteId) + query, null, email, null);
    }

    private static String path(UUID athleteId) {
        return "/api/athletes/" + athleteId + "/meals";
    }

    // Request con la sesión de ese email, o con un token fijo (ambos null = sin token). Un body String se manda tal
    // cual (JSON roto o vacío); cualquier otro se serializa
    private ResponseEntity<String> exchange(HttpMethod method, String uri, Object body, String email, String token) {
        RestClient.RequestBodySpec request = client.method(method)
                .uri(uri)
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

    // Campo → mensaje, de fieldErrors
    private Map<String, String> fieldErrors(ResponseEntity<String> response) {
        Map<String, String> errors = new LinkedHashMap<>();
        json(response).get("fieldErrors").forEach(error ->
                errors.put(error.get("field").asString(), error.get("message").asString()));
        return errors;
    }

    private static List<String> types(JsonNode meals) {
        List<String> types = new ArrayList<>();
        meals.forEach(meal -> types.add(meal.get("type").asString()));
        return types;
    }

    private void assertUnauthorized(ResponseEntity<String> response) {
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(UNAUTHORIZED_MESSAGE, json(response).get("message").asString());
    }

    // 403 de la regla de rol (SecurityConfig)
    private void assertRoleForbidden(ResponseEntity<String> response) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(ROLE_FORBIDDEN_MESSAGE, json(response).get("message").asString());
    }

    // 403 de pertenencia (AthleteAccessGuard)
    private void assertAthleteForbidden(ResponseEntity<String> response, Athlete requested) {
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        JsonNode body = json(response);
        assertEquals(AthleteAccessDeniedException.MESSAGE, body.get("message").asString());
        assertTrue(body.get("path").asString().startsWith(path(requested.getId())));
    }

    private void assertMealUnchanged(UUID mealId, String expectedType, int expectedItems) {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "select m.meal_type_id, count(i.id) as items from meals m left join meal_items i on i.meal_id = m.id"
                        + " where m.id = ? group by m.id", mealId);
        assertEquals(expectedItems, ((Number) row.get("items")).intValue());
        assertEquals(MealType.valueOf(expectedType).getId(), ((Number) row.get("meal_type_id")).shortValue());
    }

    private UUID firstItemId(UUID mealId) {
        return jdbcTemplate.queryForObject("select id from meal_items where meal_id = ? order by sort_order limit 1",
                UUID.class, mealId);
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

    private Meal saveMeal(Athlete athlete, LocalDate date, MealType type, String description,
                          MealItem... items) {
        return mealRepository.saveAndFlush(meal(athlete, date, type, description, items));
    }

    private int countMeals(Athlete athlete) {
        return count("select count(*) from meals where athlete_id = ?", athlete.getId());
    }

    private int countItems(UUID mealId) {
        return count("select count(*) from meal_items where meal_id = ?", mealId);
    }

    private int count(String sql, Object... args) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return count == null ? 0 : count;
    }
}
