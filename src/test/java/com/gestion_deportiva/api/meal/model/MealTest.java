package com.gestion_deportiva.api.meal.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.MealFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.MealFixtures.DATE;
import static com.gestion_deportiva.api.support.MealFixtures.chicken;
import static com.gestion_deportiva.api.support.MealFixtures.item;
import static com.gestion_deportiva.api.support.MealFixtures.meal;
import static com.gestion_deportiva.api.support.MealFixtures.rice;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MealTest {

    private static final Instant CORRECTED_AT = Instant.parse("2026-11-02T09:30:00.123456Z");

    private final Athlete leo = athlete("leo@test.com", coach("ana@test.com"));

    @Test
    void shouldCreateTheMealWithItsDataItemsAndTheSameCreationAndUpdateInstant() {
        // Act
        Meal lunch = meal(leo, DATE, MealType.LUNCH, "  Con ensalada  ", item(chicken(), "150"), item(rice(), "200"));

        // Assert
        assertEquals(leo, lunch.getAthlete());
        assertEquals(DATE, lunch.getEatenOn());
        assertEquals(MealType.LUNCH, lunch.getType());
        assertEquals("Con ensalada", lunch.getDescription());
        assertEquals(CREATED_AT, lunch.getCreatedAt());
        assertEquals(CREATED_AT, lunch.getUpdatedAt());
        assertEquals(2, lunch.getItems().size());
    }

    // Contrato 11.2: el orden de los ítems es el de la carga, con sort_order 0, 1, 2...
    @Test
    void shouldNumberTheItemsInTheOrderTheyWereLoaded() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, null, item(chicken(), "150"), item(rice(), "200"));

        assertEquals((short) 0, lunch.getItems().get(0).getSortOrder());
        assertEquals((short) 1, lunch.getItems().get(1).getSortOrder());
        assertTrue(lunch.getItems().stream().allMatch(item -> item.getMeal() == lunch));
    }

    // Contrato 11.2: la suma de las calorías ya redondeadas de los ítems (150 g de pollo + 200 g de arroz = 507.50)
    @Test
    void shouldSumTheCaloriesOfItsItems() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, null, item(chicken(), "150"), item(rice(), "200"));

        assertEquals(new BigDecimal("507.50"), lunch.getTotalCaloriesKcal());
    }

    // Contrato 11.2: una descripción sola no tiene calorías calculables: null, no 0
    @Test
    void shouldHaveNoTotalCaloriesWithoutItems() {
        Meal snack = meal(leo, DATE, MealType.SNACK, "Una banana", new MealItem[0]);

        assertNull(snack.getTotalCaloriesKcal());
        assertTrue(snack.getItems().isEmpty());
    }

    @Test
    void shouldStoreABlankDescriptionAsNull() {
        Meal snack = meal(leo, DATE, MealType.SNACK, "   ", item(chicken(), "50"));

        assertNull(snack.getDescription());
    }

    @Test
    void shouldAcceptAMealWithOnlyADescription() {
        assertEquals("Milanesa con puré", meal(leo, DATE, MealType.DINNER, "Milanesa con puré").getDescription());
    }

    @Test
    void shouldRejectAMealWithoutDescriptionAndWithoutItems() {
        assertThrows(IllegalArgumentException.class,
                () -> meal(leo, DATE, MealType.DINNER, "  ", new MealItem[0]));
    }

    @Test
    void shouldRejectMoreThanFiftyItemsAndADescriptionOfMoreThan500Characters() {
        MealItem[] fiftyOne = new MealItem[Meal.MAX_ITEMS + 1];
        for (int i = 0; i < fiftyOne.length; i++) {
            fiftyOne[i] = item(chicken(), "1");
        }
        String longDescription = "a".repeat(Meal.MAX_DESCRIPTION_LENGTH + 1);

        assertThrows(IllegalArgumentException.class, () -> meal(leo, DATE, MealType.LUNCH, null, fiftyOne));
        assertThrows(IllegalArgumentException.class, () -> meal(leo, DATE, MealType.LUNCH, longDescription));
    }

    @Test
    void shouldAcceptExactlyFiftyItemsAndADescriptionOf500Characters() {
        MealItem[] fifty = new MealItem[Meal.MAX_ITEMS];
        for (int i = 0; i < fifty.length; i++) {
            fifty[i] = item(chicken(), "1");
        }

        Meal full = meal(leo, DATE, MealType.LUNCH, "a".repeat(Meal.MAX_DESCRIPTION_LENGTH), fifty);

        assertEquals(Meal.MAX_ITEMS, full.getItems().size());
    }

    // Contrato 11.5: la edición reemplaza todo y actualiza updatedAt, pero no createdAt
    @Test
    void shouldCorrectEverythingAndUpdateOnlyTheUpdateInstant() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, "Algo", item(chicken(), "150"));

        lunch.correct(LocalDate.of(2026, 1, 11), MealType.DINNER, "Cena liviana",
                List.of(item(rice(), "100")), CORRECTED_AT);

        assertEquals(LocalDate.of(2026, 1, 11), lunch.getEatenOn());
        assertEquals(MealType.DINNER, lunch.getType());
        assertEquals("Cena liviana", lunch.getDescription());
        assertEquals(1, lunch.getItems().size());
        assertEquals("Arroz blanco cocido", lunch.getItems().get(0).getFoodName());
        assertEquals((short) 0, lunch.getItems().get(0).getSortOrder());
        assertEquals(CREATED_AT, lunch.getCreatedAt());
        assertEquals(CORRECTED_AT, lunch.getUpdatedAt());
    }

    @Test
    void shouldKeepTheCurrentDataWhenACorrectionIsInvalid() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, "Algo", item(chicken(), "150"));

        assertThrows(IllegalArgumentException.class,
                () -> lunch.correct(DATE, MealType.LUNCH, null, List.of(), CORRECTED_AT));

        assertEquals("Algo", lunch.getDescription());
        assertEquals(1, lunch.getItems().size());
        assertEquals(CREATED_AT, lunch.getUpdatedAt());
    }

    @Test
    void shouldNotAllowChangingTheItemsFromOutside() {
        Meal lunch = meal(leo, DATE, MealType.LUNCH, null, item(chicken(), "150"));

        assertThrows(UnsupportedOperationException.class, () -> lunch.getItems().clear());
    }

    @Test
    void shouldTruncateTheInstantsToMicroseconds() {
        Meal meal = new Meal(leo, DATE, MealType.SNACK, "Yogur",
                List.of(), Instant.parse("2026-11-01T12:00:00.123456789Z"));

        assertEquals(Instant.parse("2026-11-01T12:00:00.123456Z"), meal.getCreatedAt());
    }

    @Test
    void shouldRejectAMealWithoutAthlete() {
        assertThrows(NullPointerException.class, () -> new Meal(null, DATE, MealType.SNACK, "Yogur", List.of(),
                CREATED_AT));
    }

    @Test
    void shouldCompareByIdOnly() {
        Meal first = meal(leo, DATE, MealType.LUNCH, "Uno");
        Meal second = meal(leo, DATE, MealType.LUNCH, "Uno");
        ReflectionTestUtils.setField(first, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(second, "id", UUID.randomUUID());

        assertFalse(first.equals(second));
        assertNotEquals(first, second);
        assertEquals(first, first);
        assertFalse(first.equals(null));
    }
}
