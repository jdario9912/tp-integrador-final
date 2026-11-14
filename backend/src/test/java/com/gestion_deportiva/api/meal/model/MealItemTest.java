package com.gestion_deportiva.api.meal.model;

import com.gestion_deportiva.api.food.model.Food;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.UUID;

import static com.gestion_deportiva.api.support.MealFixtures.chicken;
import static com.gestion_deportiva.api.support.MealFixtures.food;
import static com.gestion_deportiva.api.support.MealFixtures.item;
import static com.gestion_deportiva.api.support.MealFixtures.rice;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MealItemTest {

    // Contrato 11.8: cantidad × valor de referencia / porción de referencia
    @Test
    void shouldCalculateTheChickenValuesForItsQuantity() {
        MealItem item = item(chicken(), "150");

        assertEquals(money("247.50"), item.getCaloriesKcal());
        assertEquals(money("46.50"), item.getProteinG());
        assertEquals(money("0.00"), item.getCarbsG());
        assertEquals(money("5.40"), item.getFatG());
    }

    @Test
    void shouldCalculateTheRiceValuesForItsQuantity() {
        MealItem item = item(rice(), "200");

        assertEquals(money("260.00"), item.getCaloriesKcal());
        assertEquals(money("5.40"), item.getProteinG());
        assertEquals(money("56.00"), item.getCarbsG());
        assertEquals(money("0.60"), item.getFatG());
    }

    // Una porción de referencia distinta de 100 g: 2 × 100 / 3 = 66.666... → 66.67 (HALF_UP)
    @Test
    void shouldRoundEachValueHalfUpToTwoDecimals() {
        Food thirdOfHundred = food("Porción de 3 g", "3", "100", "0", "0", "0");

        assertEquals(money("66.67"), item(thirdOfHundred, "2").getCaloriesKcal());
        assertEquals(money("33.33"), item(thirdOfHundred, "1").getCaloriesKcal());
    }

    @Test
    void shouldCopyTheNameAndTheReferenceValuesOfTheFoodAtTheMomentOfLoadingIt() {
        Food food = chicken();
        UUID foodId = food.getId();
        MealItem item = item(food, "150");

        // El catálogo cambia después (US-39): el ítem ya cargado conserva la copia
        food.rename("Pollo renombrado");
        food.updateNutrition(new BigDecimal("100"), new BigDecimal("400"), new BigDecimal("1"),
                new BigDecimal("1"), new BigDecimal("1"));

        assertEquals("Pechuga de pollo cocida", item.getFoodName());
        assertEquals(foodId, item.getFoodId());
        assertEquals(money("247.50"), item.getCaloriesKcal());
    }

    @Test
    void shouldStoreTheQuantityWithTwoDecimals() {
        assertEquals(money("150.00"), item(chicken(), "150").getQuantityG());
        assertEquals(money("99999.99"), item(chicken(), "99999.99").getQuantityG());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "0.001", "0.005", "100000"})
    void shouldRejectAQuantityThatIsNotPositiveHasMoreThanTwoDecimalsOrIsTooBig(String quantityG) {
        assertThrows(IllegalArgumentException.class, () -> item(chicken(), quantityG));
    }

    @Test
    void shouldRejectAMissingQuantityOrFood() {
        assertThrows(NullPointerException.class, () -> MealItem.of(chicken(), null));
        assertThrows(NullPointerException.class, () -> MealItem.of(null, new BigDecimal("150")));
    }

    @Test
    void shouldCompareByIdOnly() {
        MealItem first = item(chicken(), "150");
        MealItem second = item(chicken(), "150");

        assertNotEquals(first, second);
        assertEquals(first, first);
    }

    private static BigDecimal money(String value) {
        return new BigDecimal(value);
    }
}
