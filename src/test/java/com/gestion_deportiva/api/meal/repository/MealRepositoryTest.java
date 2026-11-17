package com.gestion_deportiva.api.meal.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static com.gestion_deportiva.api.support.FoodFixtures.food;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.MealFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.MealFixtures.item;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Persistencia de las comidas (US-23) contra PostgreSQL real: tablas y copia de los alimentos, orden del día,
// pertenencia, borrado en cascada y las restricciones de la base. Cada test corre en una transacción que se revierte
class MealRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_12 = LocalDate.of(2026, 11, 12);
    private static final LocalDate NOV_13 = LocalDate.of(2026, 11, 13);

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbc;

    private Athlete leo;

    private Athlete mia;

    private Food chicken;

    private Food rice;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
        // Nombres propios: la V9 precarga alimentos, y FoodRepositoryTest vacía la tabla en su transacción
        chicken = foodRepository.saveAndFlush(food("Pollo de prueba"));
        rice = foodRepository.saveAndFlush(food("Arroz de prueba"));
    }

    @Test
    void savesTheMealWithItsItemsAndTheCopyOfTheFood() {
        // Act
        Meal lunch = mealRepository.saveAndFlush(
                meal(leo, NOV_13, MealType.LUNCH, "Con pan", item(chicken, "150"), item(rice, "200")));

        // Assert: la comida (sin foto, que llega en la ola 2)
        Map<String, Object> row = jdbc.queryForMap(
                "select athlete_id, eaten_on, meal_type_id, description, photo_path from meals where id = ?",
                lunch.getId());
        assertEquals(leo.getId(), row.get("athlete_id"));
        assertEquals(NOV_13, ((java.sql.Date) row.get("eaten_on")).toLocalDate());
        assertEquals((short) 2, ((Number) row.get("meal_type_id")).shortValue());
        assertEquals("Con pan", row.get("description"));
        assertNull(row.get("photo_path"));

        // Assert: los ítems con el orden de carga y la copia del alimento
        List<Map<String, Object>> items = jdbc.queryForList(
                "select sort_order, food_id, food_name, quantity_g, ref_calories_kcal from meal_items"
                        + " where meal_id = ? order by sort_order", lunch.getId());
        assertEquals(2, items.size());
        assertEquals(chicken.getId(), items.get(0).get("food_id"));
        assertEquals("Pollo de prueba", items.get(0).get("food_name"));
        assertEquals(0, new BigDecimal("150").compareTo((BigDecimal) items.get(0).get("quantity_g")));
        assertEquals(0, new BigDecimal("165").compareTo((BigDecimal) items.get(0).get("ref_calories_kcal")));
        assertEquals(rice.getId(), items.get(1).get("food_id"));
    }

    @Test
    void storesTheCreationInstantOfTheMeal() {
        Meal snack = mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.SNACK, "Yogur"));

        Timestamp createdAt = jdbc.queryForObject("select created_at from meals where id = ?", Timestamp.class,
                snack.getId());
        assertEquals(CREATED_AT, createdAt.toInstant());
    }

    // Listado del día (contrato 11.7): por tipo del catálogo y, dentro de cada tipo, por alta
    @Test
    void findsTheDayOrderedByTypeThenCreationAndKeepsTheItemOrder() {
        mealRepository.saveAndFlush(mealCreatedAt(leo, NOV_13, MealType.DINNER, "Cena", "2026-11-13T06:00:00Z"));
        mealRepository.saveAndFlush(mealCreatedAt(leo, NOV_13, MealType.LUNCH, "Almuerzo", "2026-11-13T08:00:00Z"));
        mealRepository.saveAndFlush(mealCreatedAt(leo, NOV_13, MealType.BREAKFAST, "Desayuno tarde",
                "2026-11-13T10:00:00Z"));
        // Mismo tipo que el anterior, pero dado de alta antes: va primero aunque se haya cargado después
        mealRepository.saveAndFlush(mealCreatedAt(leo, NOV_13, MealType.BREAKFAST, "Desayuno temprano",
                "2026-11-13T07:00:00Z"));
        Meal withItems = mealRepository.saveAndFlush(new Meal(leo, NOV_13, MealType.COLLATION, null,
                List.of(item(rice, "200"), item(chicken, "150")), Instant.parse("2026-11-13T09:00:00Z")));
        entityManager.flush();
        entityManager.clear();

        // Act
        List<Meal> day = mealRepository.findDay(leo.getId(), NOV_13);

        // Assert
        // Desayunos (por alta), almuerzo, cena y colación (sin descripción): el orden del catálogo, no el de carga
        assertEquals(Arrays.asList("Desayuno temprano", "Desayuno tarde", "Almuerzo", "Cena", null),
                day.stream().map(Meal::getDescription).toList());
        assertEquals(MealType.BREAKFAST, day.get(0).getType());
        assertEquals(MealType.COLLATION, day.get(4).getType());
        Meal reloaded = day.get(4);
        assertEquals(withItems.getId(), reloaded.getId());
        assertEquals("Arroz de prueba", reloaded.getItems().get(0).getFoodName());
        assertEquals("Pollo de prueba", reloaded.getItems().get(1).getFoodName());
    }

    @Test
    void findsOnlyTheMealsOfThatAthleteAndThatDay() {
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, "Almuerzo de Leo", item(chicken, "150")));
        mealRepository.saveAndFlush(meal(leo, NOV_12, MealType.DINNER, "Otro día de Leo"));
        mealRepository.saveAndFlush(meal(mia, NOV_13, MealType.LUNCH, "Almuerzo de Mia"));
        entityManager.clear();

        List<Meal> day = mealRepository.findDay(leo.getId(), NOV_13);

        assertEquals(1, day.size());
        assertEquals("Almuerzo de Leo", day.get(0).getDescription());
        assertTrue(mealRepository.findDay(leo.getId(), LocalDate.of(2026, 12, 1)).isEmpty());
    }

    // Contrato 11.6: una comida de otro atleta responde igual que una inexistente
    @Test
    void doesNotFindAMealThroughAnotherAthlete() {
        Meal lunch = mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, "Almuerzo"));

        assertTrue(mealRepository.findByIdAndAthleteId(lunch.getId(), mia.getId()).isEmpty());
        assertTrue(mealRepository.findByIdAndAthleteId(lunch.getId(), leo.getId()).isPresent());
    }

    @Test
    void deletingTheMealDeletesItsItems() {
        Meal lunch = mealRepository.saveAndFlush(
                meal(leo, NOV_13, MealType.LUNCH, null, item(chicken, "150"), item(rice, "200")));

        // Act
        mealRepository.delete(lunch);
        mealRepository.flush();

        // Assert
        assertEquals(0, count("select count(*) from meal_items where meal_id = ?", lunch.getId()));
        assertEquals(0, count("select count(*) from meals where id = ?", lunch.getId()));
    }

    // Contrato 11.5: al editar, los ítems anteriores se reemplazan (el orden se repite y no choca)
    @Test
    void replacingTheItemsKeepsOnlyTheNewOnes() {
        Meal lunch = mealRepository.saveAndFlush(
                meal(leo, NOV_13, MealType.LUNCH, null, item(chicken, "150"), item(rice, "200")));

        // Act
        lunch.correct(NOV_13, MealType.LUNCH, "Solo arroz", List.of(item(rice, "100")),
                Instant.parse("2026-11-13T20:00:00Z"));
        mealRepository.saveAndFlush(lunch);
        entityManager.clear();

        // Assert
        List<Map<String, Object>> items = jdbc.queryForList(
                "select sort_order, food_name from meal_items where meal_id = ?", lunch.getId());
        assertEquals(1, items.size());
        assertEquals("Arroz de prueba", items.get(0).get("food_name"));
        assertEquals((short) 0, ((Number) items.get(0).get("sort_order")).shortValue());
    }

    // La unicidad de (comida, orden) se controla al confirmar; con SET CONSTRAINTS ALL IMMEDIATE se ve al instante
    @Test
    void rejectsTwoItemsWithTheSameOrderOnceTheConstraintIsChecked() {
        Meal lunch = mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, null, item(chicken, "150")));
        jdbc.execute("SET CONSTRAINTS ALL IMMEDIATE");

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into meal_items (meal_id, sort_order, food_id, food_name, quantity_g, ref_portion_g,"
                        + " ref_calories_kcal, ref_protein_g, ref_carbs_g, ref_fat_g)"
                        + " values (?, 0, ?, 'Otro', 10, 100, 1, 1, 1, 1)", lunch.getId(), rice.getId()));
    }

    @Test
    void rejectsAQuantityOfZeroAtTheDatabase() {
        Meal lunch = mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, "Algo"));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into meal_items (meal_id, sort_order, food_id, food_name, quantity_g, ref_portion_g,"
                        + " ref_calories_kcal, ref_protein_g, ref_carbs_g, ref_fat_g)"
                        + " values (?, 0, ?, 'Pollo', 0, 100, 165, 31, 0, 3.6)", lunch.getId(), chicken.getId()));
    }

    @Test
    void rejectsABlankDescriptionAtTheDatabase() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into meals (athlete_id, eaten_on, meal_type_id, description) values (?, ?, 2, '   ')",
                leo.getId(), NOV_13));
    }

    // El orden del catálogo en la base coincide con el del enum (el listado del día depende de eso)
    @Test
    void loadsTheMealTypesInTheCatalogOrder() {
        List<String> codes = jdbc.queryForList("select code from meal_types order by id", String.class);

        assertEquals(List.of("BREAKFAST", "LUNCH", "SNACK", "DINNER", "COLLATION", "PRE_WORKOUT", "POST_WORKOUT"),
                codes);
    }

    // ---------- US-24 · resumen del día (consulta agregada, contrato 16.6) ----------

    // Cada ítem se redondea a 2 decimales (HALF_UP) antes de sumar: dos de 2.5 g de un alimento de 1 kcal por 100 g
    // valen 0.03 cada uno (0.025 redondeado), así que el total es 0.06 y no 0.05 (el valor exacto del día)
    @Test
    void sumsTheRoundedValuesOfEachItemAndNotTheExactTotal() {
        Food seed = savedFood("Semilla resumen", "1", "0", "0", "0");
        Meal snack = mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.SNACK, null,
                item(seed, "2.5"), item(seed, "2.5")));

        MealDayTotals totals = mealRepository.sumDay(leo.getId(), NOV_13);

        assertDecimal("0.06", totals.getCaloriesKcal());
        // Lo mismo que muestra la comida: la suma de sus ítems ya redondeados
        assertEquals(0, snack.getTotalCaloriesKcal().compareTo(totals.getCaloriesKcal()));
    }

    // Contrato 13.8 y 16.2: almuerzo de 150 g de pollo y 200 g de arroz, con los macros de cada uno sumados
    @Test
    void sumsTheCaloriesAndTheMacrosOfTheDay() {
        Food chickenValues = savedFood("Pollo nutricional", "165", "31", "0", "3.6");
        Food riceValues = savedFood("Arroz nutricional", "130", "2.7", "28", "0.3");
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, null,
                item(chickenValues, "150"), item(riceValues, "200")));

        MealDayTotals totals = mealRepository.sumDay(leo.getId(), NOV_13);

        assertDecimal("507.50", totals.getCaloriesKcal());
        assertDecimal("51.90", totals.getProteinG());
        assertDecimal("56.00", totals.getCarbsG());
        assertDecimal("6.00", totals.getFatG());
    }

    // Las comidas sin ítems cuentan en mealCount y en mealsWithoutNutrition, pero no suman nada
    @Test
    void countsTheMealsWithoutItemsButKeepsThemOutOfTheTotals() {
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.BREAKFAST, "Café"));
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, null, item(chicken, "150")));

        MealDayTotals totals = mealRepository.sumDay(leo.getId(), NOV_13);

        assertEquals(2L, totals.getMealCount());
        assertEquals(1L, totals.getMealsWithoutNutrition());
        assertDecimal("247.50", totals.getCaloriesKcal());
    }

    // Solo cuentan las comidas de ese atleta y de ese día
    @Test
    void summarizesOnlyTheMealsOfThatAthleteAndThatDay() {
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, null, item(chicken, "150")));
        mealRepository.saveAndFlush(meal(leo, NOV_12, MealType.LUNCH, null, item(chicken, "150")));
        mealRepository.saveAndFlush(meal(mia, NOV_13, MealType.LUNCH, null, item(chicken, "150")));

        MealDayTotals totals = mealRepository.sumDay(leo.getId(), NOV_13);

        assertEquals(1L, totals.getMealCount());
        assertDecimal("247.50", totals.getCaloriesKcal());
    }

    // Sin comidas, la consulta responde una fila en cero (nunca nula): el service no trata null
    @Test
    void answersOneRowOfZerosForADayWithoutMeals() {
        MealDayTotals totals = mealRepository.sumDay(leo.getId(), NOV_13);

        assertEquals(0L, totals.getMealCount());
        assertEquals(0L, totals.getMealsWithoutNutrition());
        assertDecimal("0", totals.getCaloriesKcal());
        assertDecimal("0", totals.getFatG());
    }

    // ---------- US-25 · rango de días y revisión ----------

    // Un total por día con comidas, en orden de fecha: los días sin comidas y los de afuera del rango no vienen
    @Test
    void sumsEachDayOfTheRangeInDateOrderAndSkipsTheDaysWithoutMeals() {
        LocalDate nov10 = LocalDate.of(2026, 11, 10);
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, null, item(chicken, "150")));
        mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.DINNER, "Sopa"));
        mealRepository.saveAndFlush(meal(leo, nov10, MealType.LUNCH, null, item(chicken, "100")));
        // Fuera del rango y de otra atleta: no cuentan
        mealRepository.saveAndFlush(meal(leo, LocalDate.of(2026, 11, 14), MealType.LUNCH, "Mañana"));
        mealRepository.saveAndFlush(meal(mia, NOV_12, MealType.LUNCH, "De Mia"));

        List<MealDateTotals> days = mealRepository.sumRange(leo.getId(), nov10, NOV_13);

        assertEquals(List.of(nov10, NOV_13), days.stream().map(MealDateTotals::getDate).toList());
        assertEquals(1L, days.get(0).getMealCount());
        assertEquals(2L, days.get(1).getMealCount());
        assertEquals(1L, days.get(1).getMealsWithoutNutrition());
        assertEquals(0, days.get(1).getCaloriesKcal().compareTo(
                mealRepository.sumDay(leo.getId(), NOV_13).getCaloriesKcal()));
    }

    @Test
    void storesTheReviewOfTheMeal() {
        Meal lunch = meal(leo, NOV_13, MealType.LUNCH, "Milanesa");
        lunch.review(Instant.parse("2026-11-13T22:00:00.123456Z"), "Sumá verduras");
        mealRepository.saveAndFlush(lunch);

        Map<String, Object> row = jdbc.queryForMap(
                "select reviewed_at, coach_observation from meals where id = ?", lunch.getId());
        assertEquals(Instant.parse("2026-11-13T22:00:00.123456Z"), ((Timestamp) row.get("reviewed_at")).toInstant());
        assertEquals("Sumá verduras", row.get("coach_observation"));
    }

    // ck_meals_coach_observation: un comentario siempre tiene una revisión
    @Test
    void rejectsAnObservationWithoutReviewAtTheDatabase() {
        Meal lunch = mealRepository.saveAndFlush(meal(leo, NOV_13, MealType.LUNCH, "Milanesa"));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update meals set coach_observation = 'Sin revisión' where id = ?", lunch.getId()));
    }

    private Food savedFood(String name, String caloriesKcal, String proteinG, String carbsG, String fatG) {
        return foodRepository.saveAndFlush(Food.builder()
                .name(name)
                .referencePortionG(new BigDecimal("100"))
                .caloriesKcal(new BigDecimal(caloriesKcal))
                .proteinG(new BigDecimal(proteinG))
                .carbsG(new BigDecimal(carbsG))
                .fatG(new BigDecimal(fatG))
                .build());
    }

    // Compara el número por valor (0.06 y 0.060 son iguales)
    private static void assertDecimal(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual), "esperado " + expected + " pero fue " + actual);
    }

    // Comida con un instante de alta fijo, para probar el orden por alta
    private static Meal mealCreatedAt(Athlete athlete, LocalDate date, MealType type, String description,
                                      String createdAt) {
        return new Meal(athlete, date, type, description, List.of(), Instant.parse(createdAt));
    }

    private int count(String sql, Object... args) {
        Integer count = jdbc.queryForObject(sql, Integer.class, args);
        return count == null ? 0 : count;
    }
}
