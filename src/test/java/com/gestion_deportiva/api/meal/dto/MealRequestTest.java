package com.gestion_deportiva.api.meal.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.meal.model.enums.MealType.LUNCH;
import static com.gestion_deportiva.api.support.MealFixtures.DATE;
import static com.gestion_deportiva.api.support.MealFixtures.itemRequest;
import static com.gestion_deportiva.api.support.MealFixtures.lunchRequest;
import static com.gestion_deportiva.api.support.MealFixtures.mealRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Las reglas de forma del contrato (11.3). La fecha futura no se valida acá: depende del reloj y de la zona de la app
// (MealServiceImplTest). Cada caso compara "campo: mensaje", que es lo que llega en fieldErrors
class MealRequestTest {

    private static final UUID FOOD = UUID.randomUUID();

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
    void shouldAcceptADescriptionOnly() {
        assertTrue(errors(mealRequest(DATE, LUNCH, "Ensalada")).isEmpty());
    }

    @Test
    void shouldAcceptItemsOnly() {
        assertTrue(errors(mealRequest(DATE, LUNCH, null, itemRequest(FOOD, "150"))).isEmpty());
    }

    @Test
    void shouldAcceptDescriptionAndItemsTogether() {
        assertTrue(errors(mealRequest(DATE, LUNCH, "Con pan", itemRequest(FOOD, "150"))).isEmpty());
    }

    @Test
    void shouldAcceptTheSameFoodRepeatedAndTheMaximumQuantity() {
        assertTrue(errors(mealRequest(DATE, LUNCH, null, itemRequest(FOOD, "99999.99"),
                itemRequest(FOOD, "1"))).isEmpty());
    }

    @Test
    void shouldAcceptAMissingItemsListAsEmpty() {
        MealRequest request = new MealRequest(DATE, LUNCH, "Solo texto", null);

        assertTrue(request.items().isEmpty());
        assertTrue(errors(request).isEmpty());
    }

    // Regla cruzada (contrato 11.3): sin descripción ni alimentos, el error va en "items"
    @Test
    void shouldRequireADescriptionOrAtLeastOneItem() {
        assertEquals(Set.of("items: Cargá una descripción o al menos un alimento"),
                errors(mealRequest(DATE, LUNCH, null)));
    }

    @Test
    void shouldTreatABlankDescriptionAsMissing() {
        assertEquals(Set.of("items: Cargá una descripción o al menos un alimento"),
                errors(mealRequest(DATE, LUNCH, "   ")));
    }

    @Test
    void shouldRejectMissingDateAndType() {
        assertEquals(Set.of("date: La fecha es obligatoria", "type: El tipo de comida es obligatorio"),
                errors(new MealRequest(null, null, "Algo", List.of())));
    }

    @Test
    void shouldRejectADescriptionOfMoreThan500Characters() {
        assertEquals(Set.of("description: La descripción no puede superar los 500 caracteres"),
                errors(mealRequest(DATE, LUNCH, "a".repeat(501))));
    }

    @Test
    void shouldAcceptADescriptionOf500Characters() {
        assertTrue(errors(mealRequest(DATE, LUNCH, "a".repeat(500))).isEmpty());
    }

    @Test
    void shouldRejectMoreThanFiftyItems() {
        MealItemRequest[] fiftyOne = new MealItemRequest[51];
        for (int i = 0; i < fiftyOne.length; i++) {
            fiftyOne[i] = itemRequest(FOOD, "1");
        }

        assertEquals(Set.of("items: Una comida admite hasta 50 alimentos"),
                errors(mealRequest(DATE, LUNCH, null, fiftyOne)));
    }

    @Test
    void shouldRejectAnItemWithoutFood() {
        assertEquals(Set.of("items[0].foodId: El alimento es obligatorio"),
                errors(mealRequest(DATE, LUNCH, null, itemRequest(null, "150"))));
    }

    // Un null en la lista no llega a Bean Validation: el constructor lo rechaza (Jackson responde 400 mal formado)
    @Test
    void shouldRejectANullItemInTheList() {
        assertThrows(IllegalArgumentException.class,
                () -> new MealRequest(DATE, LUNCH, null, Arrays.asList((MealItemRequest) null)));
    }

    @Test
    void shouldRejectAMissingQuantity() {
        assertEquals(Set.of("items[0].quantityG: La cantidad es obligatoria"),
                errors(mealRequest(DATE, LUNCH, null, itemRequest(FOOD, null))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "0.00", "-5"})
    void shouldRejectAQuantityNotGreaterThanZero(String quantityG) {
        assertEquals(Set.of("items[0].quantityG: La cantidad debe ser mayor a 0 g"),
                errors(mealRequest(DATE, LUNCH, null, itemRequest(FOOD, quantityG))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.001", "1.005", "100000", "123456.78"})
    void shouldRejectAQuantityWithMoreThanFiveIntegerOrTwoDecimalDigits(String quantityG) {
        assertEquals(Set.of("items[0].quantityG: La cantidad admite hasta 5 enteros y 2 decimales"),
                errors(mealRequest(DATE, LUNCH, null, itemRequest(FOOD, quantityG))));
    }

    @Test
    void shouldReportEveryInvalidItemWithItsIndex() {
        MealRequest request = lunchRequest(DATE, null, null);

        assertEquals(Set.of("items[0].foodId: El alimento es obligatorio",
                        "items[1].foodId: El alimento es obligatorio"),
                errors(request));
    }

    private static Set<String> errors(MealRequest request) {
        return validator.validate(request).stream()
                .map(MealRequestTest::describe)
                .collect(Collectors.toSet());
    }

    private static String describe(ConstraintViolation<MealRequest> violation) {
        return violation.getPropertyPath() + ": " + violation.getMessage();
    }
}
