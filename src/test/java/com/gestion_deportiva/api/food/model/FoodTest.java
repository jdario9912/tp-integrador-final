package com.gestion_deportiva.api.food.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static com.gestion_deportiva.api.support.FoodFixtures.food;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FoodTest {

    @Test
    void shouldTrimTheNameOnCreationAndRename() {
        Food food = food("  Arroz  ");
        assertEquals("Arroz", food.getName());

        food.rename("  Arroz integral ");
        assertEquals("Arroz integral", food.getName());
    }

    @Test
    void shouldRejectANullName() {
        Food food = food("Arroz");
        assertThrows(NullPointerException.class, () -> food.rename(null));
    }

    @Test
    void shouldReplaceTheWholeNutrition() {
        // Arrange
        Food food = food("Arroz");

        // Act
        food.updateNutrition(new BigDecimal("50"), new BigDecimal("65"), new BigDecimal("1.35"),
                new BigDecimal("14"), new BigDecimal("0.15"));

        // Assert
        assertEquals(new BigDecimal("50"), food.getReferencePortionG());
        assertEquals(new BigDecimal("65"), food.getCaloriesKcal());
        assertEquals(new BigDecimal("1.35"), food.getProteinG());
        assertEquals(new BigDecimal("14"), food.getCarbsG());
        assertEquals(new BigDecimal("0.15"), food.getFatG());
    }

    @Test
    void shouldRejectAMissingNutrient() {
        Food food = food("Arroz");
        assertThrows(NullPointerException.class, () -> food.updateNutrition(BigDecimal.ONE, BigDecimal.ONE,
                BigDecimal.ONE, null, BigDecimal.ONE));
    }

    @Test
    void shouldNotBeEqualWithoutId() {
        assertNotEquals(food("Arroz"), food("Arroz"));
    }
}
