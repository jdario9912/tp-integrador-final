package com.gestion_deportiva.api.athlete.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.IdentityFixtures.updateAthleteRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.updateAthleteRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UpdateAthleteRequestTest {

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
        assertTrue(validator.validate(updateAthleteRequest("leo@test.com")).isEmpty());
    }

    @Test
    void shouldAcceptRequestWithoutOptionalFields() {
        assertTrue(validator.validate(updateAthleteRequestWithOnlyRequired("leo@test.com")).isEmpty());
    }

    @Test
    void shouldRejectEmptyRequiredFields() {
        // Arrange
        UpdateAthleteRequest request = new UpdateAthleteRequest(" ", "", null, null, null, null, null, null,
                null, null, null, null, null, null);

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("firstName", "lastName", "email"), fields);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"no-es-un-email", "leo@", "@test.com", "leo gil@test.com"})
    void shouldRejectInvalidEmail(String email) {
        assertEquals(Set.of("email"), invalidFields(updateAthleteRequestWithOnlyRequired(email)));
    }

    @Test
    void shouldRejectEmailOver255Characters() {
        // 256 caracteres con formato válido
        String email = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(63);

        assertEquals(Set.of("email"), invalidFields(updateAthleteRequestWithOnlyRequired(email)));
    }

    @Test
    void shouldAcceptFieldsAtLimits() {
        UpdateAthleteRequest request = new UpdateAthleteRequest("a".repeat(100), "b".repeat(100),
                "leo@test.com", "1".repeat(30), null, null, LocalDate.now().minusDays(1),
                new BigDecimal("999.99"), new BigDecimal("0.01"), "c".repeat(255), "d".repeat(500),
                "e".repeat(500), (short) 1, null);

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void shouldRejectFieldsOverMaxLength() {
        // Arrange
        UpdateAthleteRequest request = new UpdateAthleteRequest("a".repeat(101), "b".repeat(101),
                "leo@test.com", "1".repeat(31), null, null, null, null, null,
                "c".repeat(256), "d".repeat(501), "e".repeat(501), null, null);

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("firstName", "lastName", "phone", "goal", "injuries", "limitations"), fields);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "0.00"})
    void shouldRejectHeightAndWeightNotPositive(String value) {
        assertEquals(Set.of("heightCm", "initialWeightKg"),
                invalidFields(withMeasurements(new BigDecimal(value), new BigDecimal(value))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"1000", "70.123"})
    void shouldRejectHeightAndWeightThatDoNotFitNumeric5_2(String value) {
        assertEquals(Set.of("heightCm", "initialWeightKg"),
                invalidFields(withMeasurements(new BigDecimal(value), new BigDecimal(value))));
    }

    @ParameterizedTest
    @ValueSource(shorts = {0, 8, -1})
    void shouldRejectAvailableDaysOutsideOneToSeven(short days) {
        // Act
        Set<ConstraintViolation<UpdateAthleteRequest>> violations = validator.validate(withAvailableDays(days));

        // Assert
        assertEquals(1, violations.size());
        assertEquals("Los días disponibles deben estar entre 1 y 7", violations.iterator().next().getMessage());
    }

    @ParameterizedTest
    @ValueSource(shorts = {1, 7})
    void shouldAcceptAvailableDaysAtLimits(short days) {
        assertTrue(validator.validate(withAvailableDays(days)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void shouldRejectBirthDateTodayOrInTheFuture(int daysAgo) {
        assertEquals(Set.of("birthDate"), invalidFields(withBirthDate(LocalDate.now().minusDays(daysAgo))));
    }

    private static UpdateAthleteRequest withMeasurements(BigDecimal heightCm, BigDecimal initialWeightKg) {
        return new UpdateAthleteRequest("Leo", "Gil", "leo@test.com", null, null, null, null,
                heightCm, initialWeightKg, null, null, null, null, null);
    }

    private static UpdateAthleteRequest withAvailableDays(short days) {
        return new UpdateAthleteRequest("Leo", "Gil", "leo@test.com", null, null, null, null,
                null, null, null, null, null, days, null);
    }

    private static UpdateAthleteRequest withBirthDate(LocalDate birthDate) {
        return new UpdateAthleteRequest("Leo", "Gil", "leo@test.com", null, null, null,
                birthDate, null, null, null, null, null, null, null);
    }

    private static Set<String> invalidFields(UpdateAthleteRequest request) {
        return validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }
}
