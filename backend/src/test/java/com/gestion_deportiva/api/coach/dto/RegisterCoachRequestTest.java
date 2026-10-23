package com.gestion_deportiva.api.coach.dto;

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

import java.util.Set;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.IdentityFixtures.registerCoachRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegisterCoachRequestTest {

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
        assertTrue(validator.validate(registerCoachRequest("ana@test.com")).isEmpty());
    }

    @Test
    void shouldAcceptRequestWithoutOptionalFields() {
        assertTrue(validator.validate(withOnlyRequired("ana@test.com", "password123")).isEmpty());
    }

    @Test
    void shouldRejectEmptyRequiredFields() {
        // Arrange
        RegisterCoachRequest request = new RegisterCoachRequest(" ", "", null, null, null, null, null, null);

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("firstName", "lastName", "email", "password"), fields);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"no-es-un-email", "ana@", "@test.com", "ana test@test.com"})
    void shouldRejectInvalidEmail(String email) {
        assertEquals(Set.of("email"), invalidFields(withOnlyRequired(email, "password123")));
    }

    @Test
    void shouldRejectEmailLongerThan255() {
        String email = "a".repeat(64) + "@" + ("b".repeat(60) + ".").repeat(3) + "c".repeat(10) + ".com";

        assertTrue(email.length() > 255);
        assertTrue(invalidFields(withOnlyRequired(email, "password123")).contains("email"));
    }

    @ParameterizedTest
    @ValueSource(ints = {8, 72})
    void shouldAcceptPasswordAtLengthLimits(int length) {
        assertTrue(validator.validate(withOnlyRequired("ana@test.com", "p".repeat(length))).isEmpty());
    }

    @Test
    void shouldAcceptMultibytePasswordAtByteLimit() {
        // 36 caracteres, 72 bytes en UTF-8
        assertTrue(validator.validate(withOnlyRequired("ana@test.com", "ñ".repeat(36))).isEmpty());
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
    void shouldAcceptFieldsAtMaxLength() {
        RegisterCoachRequest request = new RegisterCoachRequest("a".repeat(100), "b".repeat(100),
                "ana@test.com", "password123", "1".repeat(30), "c".repeat(100), "d".repeat(50), "e".repeat(1000));

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void shouldRejectFieldsOverMaxLength() {
        // Arrange
        RegisterCoachRequest request = new RegisterCoachRequest("a".repeat(101), "b".repeat(101),
                "ana@test.com", "password123", "1".repeat(31), "c".repeat(101), "d".repeat(51), "e".repeat(1001));

        // Act
        Set<String> fields = invalidFields(request);

        // Assert
        assertEquals(Set.of("firstName", "lastName", "phone", "specialty", "licenseNumber", "bio"), fields);
    }

    private static RegisterCoachRequest withOnlyRequired(String email, String password) {
        return new RegisterCoachRequest("Ana", "Paz", email, password, null, null, null, null);
    }

    private static void assertPasswordViolation(String password, String expectedMessage) {
        // Act
        Set<ConstraintViolation<RegisterCoachRequest>> violations = validator.validate(withOnlyRequired("ana@test.com", password));

        // Assert
        assertEquals(1, violations.size());
        ConstraintViolation<RegisterCoachRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        assertEquals(expectedMessage, violation.getMessage());
    }

    private static Set<String> invalidFields(RegisterCoachRequest request) {
        return validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }
}
