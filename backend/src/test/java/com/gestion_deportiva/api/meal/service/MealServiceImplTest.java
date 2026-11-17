package com.gestion_deportiva.api.meal.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.food.exception.FoodNotFoundException;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
import com.gestion_deportiva.api.meal.dto.DailyNutritionSummary;
import com.gestion_deportiva.api.meal.dto.MealRequest;
import com.gestion_deportiva.api.meal.dto.MealResponse;
import com.gestion_deportiva.api.meal.exception.FutureMealDateException;
import com.gestion_deportiva.api.meal.exception.MealNotFoundException;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import com.gestion_deportiva.api.meal.repository.MealDayTotals;
import com.gestion_deportiva.api.meal.repository.MealRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.MealFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.MealFixtures.DATE;
import static com.gestion_deportiva.api.support.MealFixtures.chicken;
import static com.gestion_deportiva.api.support.MealFixtures.item;
import static com.gestion_deportiva.api.support.MealFixtures.itemRequest;
import static com.gestion_deportiva.api.support.MealFixtures.lunchRequest;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static com.gestion_deportiva.api.support.MealFixtures.mealRequest;
import static com.gestion_deportiva.api.support.MealFixtures.rice;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Reglas de negocio de las comidas (US-23) con el reloj fijo: fecha futura, pertenencia, alimentos y transacción
@ExtendWith(MockitoExtension.class)
class MealServiceImplTest {

    // 13/11/2026 a las 13:00 en Argentina (16:00 UTC): "hoy" es el 13 y "mañana", el 14
    private static final Instant NOW = Instant.parse("2026-11-13T16:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 13);
    private static final LocalDate TOMORROW = LocalDate.of(2026, 11, 14);
    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID MEAL_ID = UUID.randomUUID();
    private static final AuthenticatedUser LEO = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);

    @Mock
    private MealRepository mealRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private FoodRepository foodRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private MealServiceImpl service;

    private Athlete leo;

    @BeforeEach
    void setUp() {
        AppClock appClock = new AppClock(Clock.fixed(NOW, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        service = new MealServiceImpl(mealRepository, athleteRepository, foodRepository, athleteAccessGuard, appClock);
        leo = athlete("leo@test.com", coach("ana@test.com"));
    }

    // ---------- alta ----------

    @Test
    void shouldRejectAFutureDateBeforeCheckingTheAthlete() {
        MealRequest request = mealRequest(TOMORROW, MealType.DINNER, "Milanesa");

        assertThrows(FutureMealDateException.class, () -> service.create(LEO, ATHLETE_ID, request));

        verifyNoInteractions(athleteAccessGuard, mealRepository);
    }

    @Test
    void shouldCheckTheAthleteBeforeLoadingTheFoods() {
        doThrow(new AthleteNotFoundException(ATHLETE_ID)).when(athleteAccessGuard).verifyAccess(LEO, ATHLETE_ID);

        assertThrows(AthleteNotFoundException.class,
                () -> service.create(LEO, ATHLETE_ID, lunchRequest(TODAY, UUID.randomUUID(), UUID.randomUUID())));

        verifyNoInteractions(foodRepository, mealRepository);
    }

    // Contrato 11.4: la copia de los alimentos y las calorías de la comida (150 g de pollo y 200 g de arroz)
    @Test
    void shouldCreateTheMealWithTheFoodCopyAndItsCalories() {
        Food chicken = chicken();
        Food rice = rice();
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(foodRepository.findAllById(List.of(chicken.getId(), rice.getId()))).thenReturn(List.of(chicken, rice));
        when(mealRepository.saveAndFlush(any(Meal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        MealResponse response = service.create(LEO, ATHLETE_ID, lunchRequest(TODAY, chicken.getId(), rice.getId()));

        // Assert
        verify(athleteAccessGuard).verifyAccess(LEO, ATHLETE_ID);
        assertEquals(TODAY, response.date());
        assertEquals(MealType.LUNCH, response.type());
        assertEquals(new BigDecimal("507.50"), response.totalCaloriesKcal());
        assertEquals(NOW, response.createdAt());
        assertEquals(NOW, response.updatedAt());
        assertEquals(2, response.items().size());
        assertEquals("Pechuga de pollo cocida", response.items().get(0).foodName());
        assertEquals(chicken.getId(), response.items().get(0).foodId());
        assertEquals(new BigDecimal("247.50"), response.items().get(0).caloriesKcal());
        assertEquals(new BigDecimal("260.00"), response.items().get(1).caloriesKcal());
    }

    // Contrato 11.2: una comida solo con descripción no tiene calorías y no busca alimentos
    @Test
    void shouldCreateADescriptionOnlyMealWithoutLookingForFoods() {
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(leo);
        when(mealRepository.saveAndFlush(any(Meal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MealResponse response = service.create(LEO, ATHLETE_ID,
                mealRequest(TODAY, MealType.SNACK, "Una banana"));

        assertNull(response.totalCaloriesKcal());
        assertTrue(response.items().isEmpty());
        verifyNoInteractions(foodRepository);
    }

    // Contrato 11.4: si un alimento no existe, no se crea nada (ni la comida ni los ítems anteriores)
    @Test
    void shouldNotCreateTheMealWhenAFoodDoesNotExist() {
        Food chicken = chicken();
        UUID unknownFood = UUID.randomUUID();
        when(foodRepository.findAllById(List.of(chicken.getId(), unknownFood))).thenReturn(List.of(chicken));
        MealRequest request = mealRequest(TODAY, MealType.LUNCH, null,
                itemRequest(chicken.getId(), "150"), itemRequest(unknownFood, "100"));

        FoodNotFoundException ex = assertThrows(FoodNotFoundException.class,
                () -> service.create(LEO, ATHLETE_ID, request));

        assertEquals("No existe el alimento con id " + unknownFood, ex.getMessage());
        verify(mealRepository, never()).saveAndFlush(any(Meal.class));
    }

    // Si faltan varios, el error nombra el primero en el orden del body
    @Test
    void shouldNameTheFirstMissingFoodInTheOrderOfTheBody() {
        Food chicken = chicken();
        UUID firstUnknown = UUID.randomUUID();
        UUID secondUnknown = UUID.randomUUID();
        when(foodRepository.findAllById(List.of(firstUnknown, chicken.getId(), secondUnknown)))
                .thenReturn(List.of(chicken));
        MealRequest request = mealRequest(TODAY, MealType.LUNCH, null, itemRequest(firstUnknown, "100"),
                itemRequest(chicken.getId(), "150"), itemRequest(secondUnknown, "50"));

        FoodNotFoundException ex = assertThrows(FoodNotFoundException.class,
                () -> service.create(LEO, ATHLETE_ID, request));

        assertEquals("No existe el alimento con id " + firstUnknown, ex.getMessage());
    }

    // ---------- edición ----------

    @Test
    void shouldRejectAFutureDateBeforeCheckingTheMeal() {
        MealRequest request = mealRequest(TOMORROW, MealType.DINNER, "Cena");

        assertThrows(FutureMealDateException.class, () -> service.update(LEO, ATHLETE_ID, MEAL_ID, request));

        verifyNoInteractions(athleteAccessGuard, mealRepository);
    }

    // Contrato 11.10: la comida de otro atleta responde 404, igual que una inexistente
    @Test
    void shouldNotFindAMealThatIsNotOfThatAthlete() {
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.empty());

        assertThrows(MealNotFoundException.class,
                () -> service.update(LEO, ATHLETE_ID, MEAL_ID, mealRequest(TODAY, MealType.DINNER, "Cena")));

        verifyNoInteractions(foodRepository);
    }

    // Contrato 11.5 "todo o nada": con un alimento inexistente, la comida conserva sus datos e ítems
    @Test
    void shouldLeaveTheMealUnchangedWhenAFoodDoesNotExist() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, "Almuerzo", item(chicken(), "150"));
        UUID unknownFood = UUID.randomUUID();
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.of(lunch));
        when(foodRepository.findAllById(List.of(unknownFood))).thenReturn(List.of());
        MealRequest request = mealRequest(TODAY, MealType.DINNER, "Otra cosa", itemRequest(unknownFood, "100"));

        assertThrows(FoodNotFoundException.class, () -> service.update(LEO, ATHLETE_ID, MEAL_ID, request));

        assertEquals(MealType.LUNCH, lunch.getType());
        assertEquals("Almuerzo", lunch.getDescription());
        assertEquals(1, lunch.getItems().size());
        verify(mealRepository, never()).saveAndFlush(any(Meal.class));
    }

    @Test
    void shouldReplaceTheDataAndTheItemsKeepingTheCreationInstant() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, "Almuerzo", item(chicken(), "150"));
        Food rice = rice();
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.of(lunch));
        when(foodRepository.findAllById(List.of(rice.getId()))).thenReturn(List.of(rice));
        when(mealRepository.saveAndFlush(any(Meal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        MealResponse response = service.update(LEO, ATHLETE_ID, MEAL_ID,
                mealRequest(TODAY, MealType.DINNER, "Cena liviana", itemRequest(rice.getId(), "100")));

        // Assert
        assertEquals(MealType.DINNER, response.type());
        assertEquals("Cena liviana", response.description());
        assertEquals(1, response.items().size());
        assertEquals(new BigDecimal("130.00"), response.totalCaloriesKcal());
        assertEquals(CREATED_AT, response.createdAt());
        assertEquals(NOW, response.updatedAt());
    }

    // ---------- borrado ----------

    @Test
    void shouldDeleteTheMealAndItsItems() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, null, item(chicken(), "150"));
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.of(lunch));

        service.delete(LEO, ATHLETE_ID, MEAL_ID);

        verify(mealRepository).delete(lunch);
    }

    @Test
    void shouldNotDeleteAMealThatIsNotFound() {
        when(mealRepository.findByIdAndAthleteId(MEAL_ID, ATHLETE_ID)).thenReturn(Optional.empty());

        assertThrows(MealNotFoundException.class, () -> service.delete(LEO, ATHLETE_ID, MEAL_ID));

        verify(mealRepository, never()).delete(any(Meal.class));
    }

    @Test
    void shouldCheckThePertenenciaBeforeLookingForTheMeal() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(LEO, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class, () -> service.delete(LEO, ATHLETE_ID, MEAL_ID));

        verifyNoInteractions(mealRepository);
    }

    // ---------- listado del día ----------

    // Sin fecha, "hoy" es el de la zona de la app (el 13/11 en Argentina, que con este reloj es el mismo día en UTC)
    @Test
    void shouldListTodayInTheAppTimeZoneWhenNoDateIsGiven() {
        when(mealRepository.findDay(ATHLETE_ID, TODAY))
                .thenReturn(List.of(meal(leo, TODAY, MealType.BREAKFAST, "Café")));

        List<MealResponse> day = service.findByDay(LEO, ATHLETE_ID, null);

        assertEquals(1, day.size());
        assertEquals(TODAY, day.get(0).date());
    }

    @Test
    void shouldListTheGivenDay() {
        when(mealRepository.findDay(ATHLETE_ID, DATE)).thenReturn(List.of());

        assertTrue(service.findByDay(LEO, ATHLETE_ID, DATE).isEmpty());
    }

    // Contrato 11.7: leer un día futuro no es un error; responde lista vacía
    @Test
    void shouldAnswerAnEmptyListForAFutureDate() {
        when(mealRepository.findDay(ATHLETE_ID, TOMORROW)).thenReturn(List.of());

        assertTrue(service.findByDay(LEO, ATHLETE_ID, TOMORROW).isEmpty());
    }

    @Test
    void shouldCheckThePertenenciaBeforeListing() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(LEO, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class, () -> service.findByDay(LEO, ATHLETE_ID, TODAY));

        verifyNoInteractions(mealRepository);
    }

    // ---------- US-24 · resumen nutricional del día ----------

    // Sin fecha, el resumen es el de hoy en la zona de la app (el 13/11 en Argentina)
    @Test
    void shouldSummarizeTodayInTheAppTimeZoneWhenNoDateIsGiven() {
        when(mealRepository.sumDay(ATHLETE_ID, TODAY)).thenReturn(totals("0", "0", "0", "0", 0L, 0L));

        DailyNutritionSummary summary = service.summaryOfDay(LEO, ATHLETE_ID, null);

        assertEquals(TODAY, summary.date());
        verify(mealRepository).sumDay(ATHLETE_ID, TODAY);
    }

    // Contrato 16.2: cada total y cada contador de la consulta llega al resumen tal cual
    @Test
    void shouldMapTheTotalsAndTheCountersOfTheDay() {
        when(mealRepository.sumDay(ATHLETE_ID, DATE))
                .thenReturn(totals("507.50", "51.90", "56.00", "6.00", 2L, 1L));

        DailyNutritionSummary summary = service.summaryOfDay(LEO, ATHLETE_ID, DATE);

        verify(athleteAccessGuard).verifyAccess(LEO, ATHLETE_ID);
        assertEquals(DATE, summary.date());
        assertEquals(new BigDecimal("507.50"), summary.caloriesKcal());
        assertEquals(new BigDecimal("51.90"), summary.proteinG());
        assertEquals(new BigDecimal("56.00"), summary.carbsG());
        assertEquals(new BigDecimal("6.00"), summary.fatG());
        assertEquals(2, summary.mealCount());
        assertEquals(1, summary.mealsWithoutNutrition());
    }

    // Contrato 16.3: un día sin comidas responde todo en cero (la consulta siempre devuelve una fila)
    @Test
    void shouldAnswerZerosForADayWithoutMeals() {
        when(mealRepository.sumDay(ATHLETE_ID, DATE)).thenReturn(totals("0", "0", "0", "0", 0L, 0L));

        DailyNutritionSummary summary = service.summaryOfDay(LEO, ATHLETE_ID, DATE);

        assertEquals(0, BigDecimal.ZERO.compareTo(summary.caloriesKcal()));
        assertEquals(0, summary.mealCount());
        assertEquals(0, summary.mealsWithoutNutrition());
    }

    // Contrato 16.3: leer un día futuro no es error; sin comidas, todo en cero
    @Test
    void shouldAnswerZerosForAFutureDate() {
        when(mealRepository.sumDay(ATHLETE_ID, TOMORROW)).thenReturn(totals("0", "0", "0", "0", 0L, 0L));

        DailyNutritionSummary summary = service.summaryOfDay(LEO, ATHLETE_ID, TOMORROW);

        assertEquals(TOMORROW, summary.date());
        assertEquals(0, summary.mealCount());
    }

    // Contrato 16.4: la pertenencia va antes de sumar; si falla, la base no se consulta
    @Test
    void shouldCheckThePertenenciaBeforeSummarizing() {
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(LEO, ATHLETE_ID);

        assertThrows(AthleteAccessDeniedException.class, () -> service.summaryOfDay(LEO, ATHLETE_ID, TODAY));

        verifyNoInteractions(mealRepository);
    }

    // Fila de la consulta agregada con valores fijos (la interfaz es una proyección: no hace falta un mock)
    private static MealDayTotals totals(String caloriesKcal, String proteinG, String carbsG, String fatG,
                                        long mealCount, long mealsWithoutNutrition) {
        return new MealDayTotals() {
            @Override
            public Long getMealCount() {
                return mealCount;
            }

            @Override
            public Long getMealsWithoutNutrition() {
                return mealsWithoutNutrition;
            }

            @Override
            public BigDecimal getCaloriesKcal() {
                return new BigDecimal(caloriesKcal);
            }

            @Override
            public BigDecimal getProteinG() {
                return new BigDecimal(proteinG);
            }

            @Override
            public BigDecimal getCarbsG() {
                return new BigDecimal(carbsG);
            }

            @Override
            public BigDecimal getFatG() {
                return new BigDecimal(fatG);
            }
        };
    }
}
