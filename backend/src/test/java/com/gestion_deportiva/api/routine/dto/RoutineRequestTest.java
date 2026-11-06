package com.gestion_deportiva.api.routine.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.routineRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineRequestTest {

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
    void shouldAcceptCompleteRequest() {
        assertTrue(validator.validate(routineRequest("Fuerza")).isEmpty());
    }

    @Test
    void shouldAcceptRequestWithoutOptionalFields() {
        assertTrue(validator.validate(routineRequestWithOnlyRequired("Fuerza")).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "   "})
    void shouldRejectBlankName(String name) {
        assertEquals(Set.of("name"), invalidFields(routineRequestWithOnlyRequired(name)));
    }

    @Test
    void shouldRejectNullName() {
        assertEquals(Set.of("name"), invalidFields(routineRequestWithOnlyRequired(null)));
    }

    @Test
    void shouldAcceptNameAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(routineRequestWithOnlyRequired("a".repeat(100))).isEmpty());
        assertEquals(Set.of("name"), invalidFields(routineRequestWithOnlyRequired("a".repeat(101))));
    }

    @Test
    void shouldAcceptDescriptionAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(withDescription("d".repeat(500))).isEmpty());
        assertEquals(Set.of("description"), invalidFields(withDescription("d".repeat(501))));
    }

    @Test
    void shouldAcceptGoalAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(withGoal("g".repeat(100))).isEmpty());
        assertEquals(Set.of("goal"), invalidFields(withGoal("g".repeat(101))));
    }

    @ParameterizedTest
    @ValueSource(shorts = {1, 7})
    void shouldAcceptDaysPerWeekWithinRange(short days) {
        assertTrue(validator.validate(withDaysPerWeek(days)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(shorts = {-1, 0, 8})
    void shouldRejectDaysPerWeekOutOfRange(short days) {
        assertEquals(Set.of("daysPerWeek"), invalidFields(withDaysPerWeek(days)));
    }

    @ParameterizedTest
    @ValueSource(shorts = {1, 52})
    void shouldAcceptDurationWeeksWithinRange(short weeks) {
        assertTrue(validator.validate(withDurationWeeks(weeks)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(shorts = {-1, 0, 53})
    void shouldRejectDurationWeeksOutOfRange(short weeks) {
        assertEquals(Set.of("durationWeeks"), invalidFields(withDurationWeeks(weeks)));
    }

    private static RoutineRequest withDescription(String description) {
        return new RoutineRequest("Fuerza", description, null, null, null, null);
    }

    private static RoutineRequest withGoal(String goal) {
        return new RoutineRequest("Fuerza", null, goal, null, null, null);
    }

    private static RoutineRequest withDaysPerWeek(short days) {
        return new RoutineRequest("Fuerza", null, null, days, null, null);
    }

    private static RoutineRequest withDurationWeeks(short weeks) {
        return new RoutineRequest("Fuerza", null, null, null, weeks, null);
    }

    private static Set<String> invalidFields(RoutineRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
