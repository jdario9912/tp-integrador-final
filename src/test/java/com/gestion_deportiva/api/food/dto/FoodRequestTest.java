package com.gestion_deportiva.api.food.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.Set;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.FoodFixtures.foodRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FoodRequestTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void shouldAcceptAValidRequest() {
        assertTrue(validator.validate(foodRequest("Pechuga de pollo")).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "   "})
    void shouldRejectBlankName(String name) {
        assertEquals(Set.of("name"), invalidFields(foodRequest(name)));
    }

    @Test
    void shouldRejectEmptyRequiredFields() {
        assertEquals(Set.of("name", "referencePortionG", "caloriesKcal", "proteinG", "carbsG", "fatG"),
                invalidFields(new FoodRequest(null, null, null, null, null, null)));
    }

    @Test
    void shouldAcceptNameAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(foodRequest("a".repeat(100))).isEmpty());
        assertEquals(Set.of("name"), invalidFields(foodRequest("a".repeat(101))));
    }

    @Test
    void shouldRejectNegativeNutrients() {
        BigDecimal negative = new BigDecimal("-0.01");
        assertEquals(Set.of("caloriesKcal", "proteinG", "carbsG", "fatG"),
                invalidFields(new FoodRequest("Arroz", BigDecimal.TEN, negative, negative, negative, negative)));
    }

    @Test
    void shouldAcceptZeroNutrientsButNotAZeroPortion() {
        assertTrue(validator.validate(new FoodRequest("Agua", BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO)).isEmpty());
        assertEquals(Set.of("referencePortionG"), invalidFields(withPortion(BigDecimal.ZERO)));
    }

    @Test
    void shouldAcceptTheMaximumAndRejectAbove() {
        BigDecimal max = new BigDecimal("10000");
        BigDecimal above = new BigDecimal("10000.01");
        assertTrue(validator.validate(new FoodRequest("Arroz", max, max, max, max, max)).isEmpty());
        assertEquals(Set.of("referencePortionG", "caloriesKcal", "proteinG", "carbsG", "fatG"),
                invalidFields(new FoodRequest("Arroz", above, above, above, above, above)));
    }

    @Test
    void shouldAcceptTwoDecimalsAndRejectThree() {
        assertTrue(validator.validate(withPortion(new BigDecimal("0.01"))).isEmpty());
        assertEquals(Set.of("referencePortionG"), invalidFields(withPortion(new BigDecimal("100.555"))));
    }

    @Test
    void shouldUseTheMessagesInSpanish() {
        Set<String> messages = validator.validate(new FoodRequest(" ", BigDecimal.ZERO, new BigDecimal("-1"),
                        null, BigDecimal.ONE, new BigDecimal("1.234")))
                .stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());

        assertEquals(Set.of("El nombre es obligatorio", "La porción de referencia debe ser mayor a 0",
                "Las calorías no pueden ser negativas", "Las proteínas son obligatorias",
                "Las grasas admiten hasta 2 decimales"), messages);
    }

    private static FoodRequest withPortion(BigDecimal portion) {
        return new FoodRequest("Arroz", portion, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE);
    }

    private static Set<String> invalidFields(FoodRequest request) {
        return validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }
}
