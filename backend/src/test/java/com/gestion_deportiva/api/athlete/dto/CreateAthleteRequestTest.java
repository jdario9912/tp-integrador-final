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

import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreateAthleteRequestTest {

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
        assertTrue(validator.validate(createAthleteRequest("leo@test.com")).isEmpty());
    }

    @Test
    void shouldAcceptRequestWithoutOptionalFields() {
        assertTrue(validator.validate(createAthleteRequestWithOnlyRequired("leo@test.com", "password123")).isEmpty());
    }

    @Test
    void shouldRejectEmptyRequiredFields() {
        // Arrange
        CreateAthleteRequest request = new CreateAthleteRequest(" ", "", null, null, null, null, null, null,
                null, null, null, null, null, null, null);

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("firstName", "lastName", "email", "password"), fields);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"no-es-un-email", "leo@", "@test.com", "leo gil@test.com"})
    void shouldRejectInvalidEmail(String email) {
        assertEquals(Set.of("email"), invalidFields(createAthleteRequestWithOnlyRequired(email, "password123")));
    }

    @ParameterizedTest
    @ValueSource(ints = {8, 72})
    void shouldAcceptPasswordAtLengthLimits(int length) {
        assertTrue(validator.validate(
                createAthleteRequestWithOnlyRequired("leo@test.com", "p".repeat(length))).isEmpty());
    }

    @Test
    void shouldAcceptMultibytePasswordAtByteLimit() {
        // 36 caracteres, 72 bytes en UTF-8
        assertTrue(validator.validate(createAthleteRequestWithOnlyRequired("leo@test.com", "ñ".repeat(36))).isEmpty());
    }

    @Test
    void shouldRejectPasswordShorterThan8() {
        assertPasswordViolation("p".repeat(7), "La contraseña debe tener al menos 8 caracteres");
    }

    @ParameterizedTest
    // 73 bytes: 73 caracteres ASCII, o 72 caracteres con una ñ (BCrypt lanzaría IllegalArgumentException)
    @ValueSource(strings = {"ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp",
            "pppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppñ"})
    void shouldRejectPasswordOverBcryptByteLimit(String password) {
        assertPasswordViolation(password,
                "La contraseña no puede superar los 72 bytes (la ñ y las letras con acento cuentan doble)");
    }

    @Test
    void shouldAcceptFieldsAtLimits() {
        CreateAthleteRequest request = new CreateAthleteRequest("a".repeat(100), "b".repeat(100),
                "leo@test.com", "password123", "1".repeat(30), null, null, LocalDate.now().minusDays(1),
                new BigDecimal("999.99"), new BigDecimal("0.01"), "c".repeat(255), "d".repeat(500),
                "e".repeat(500), (short) 1, null);

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void shouldRejectFieldsOverMaxLength() {
        // Arrange
        CreateAthleteRequest request = new CreateAthleteRequest("a".repeat(101), "b".repeat(101),
                "leo@test.com", "password123", "1".repeat(31), null, null, null, null, null,
                "c".repeat(256), "d".repeat(501), "e".repeat(501), null, null);

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("firstName", "lastName", "phone", "goal", "injuries", "limitations"), fields);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "0.00"})
    void shouldRejectHeightAndWeightNotPositive(String value) {
        // Arrange
        CreateAthleteRequest request = withMeasurements(new BigDecimal(value), new BigDecimal(value));

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("heightCm", "initialWeightKg"), fields);
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
        Set<ConstraintViolation<CreateAthleteRequest>> violations = validator.validate(withAvailableDays(days));

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
        // Arrange
        CreateAthleteRequest request = withBirthDate(LocalDate.now().minusDays(daysAgo));

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("birthDate"), fields);
    }

    private static CreateAthleteRequest withMeasurements(BigDecimal heightCm, BigDecimal initialWeightKg) {
        return new CreateAthleteRequest("Leo", "Gil", "leo@test.com", "password123", null, null, null, null,
                heightCm, initialWeightKg, null, null, null, null, null);
    }

    private static CreateAthleteRequest withAvailableDays(short days) {
        return new CreateAthleteRequest("Leo", "Gil", "leo@test.com", "password123", null, null, null, null,
                null, null, null, null, null, days, null);
    }

    private static CreateAthleteRequest withBirthDate(LocalDate birthDate) {
        return new CreateAthleteRequest("Leo", "Gil", "leo@test.com", "password123", null, null, null,
                birthDate, null, null, null, null, null, null, null);
    }

    private static void assertPasswordViolation(String password, String expectedMessage) {
        // Act
        Set<ConstraintViolation<CreateAthleteRequest>> violations = validator.validate(createAthleteRequestWithOnlyRequired("leo@test.com", password));

        // Assert
        assertEquals(1, violations.size());
        ConstraintViolation<CreateAthleteRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        assertEquals(expectedMessage, violation.getMessage());
    }

    private static Set<String> invalidFields(CreateAthleteRequest request) {
        return validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }
}
