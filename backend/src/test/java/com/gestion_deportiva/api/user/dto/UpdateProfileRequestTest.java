package com.gestion_deportiva.api.user.dto;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// US-48 · Reglas de Bean Validation del perfil propio (contrato 18.4)
class UpdateProfileRequestTest {

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
    void shouldAcceptACompleteRequest() {
        assertTrue(validator.validate(request("Leo", "Gil", "leo@test.com", "+54 11 4444-4444")).isEmpty());
    }

    @Test
    void shouldAcceptARequestWithoutPhone() {
        assertTrue(validator.validate(request("Leo", "Gil", "leo@test.com", null)).isEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankFirstName(String firstName) {
        assertEquals(Set.of("firstName"), fields(request(firstName, "Gil", "leo@test.com", null)));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankLastName(String lastName) {
        assertEquals(Set.of("lastName"), fields(request("Leo", lastName, "leo@test.com", null)));
    }

    @Test
    void shouldRejectANameLongerThan100Characters() {
        assertEquals(Set.of("firstName"), fields(request("n".repeat(101), "Gil", "leo@test.com", null)));
        assertEquals(Set.of("lastName"), fields(request("Leo", "a".repeat(101), "leo@test.com", null)));
    }

    @Test
    void shouldAcceptANameOf100Characters() {
        assertTrue(validator.validate(request("n".repeat(100), "Gil", "leo@test.com", null)).isEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankEmail(String email) {
        assertEquals(Set.of("email"), fields(request("Leo", "Gil", email, null)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"sin-arroba", "leo@", "@test.com"})
    void shouldRejectAMalformedEmail(String email) {
        assertEquals(Set.of("email"), fields(request("Leo", "Gil", email, null)));
    }

    @Test
    void shouldRejectAnEmailLongerThan255Characters() {
        String email = "a".repeat(245) + "@test.com";

        assertEquals(Set.of("email"), fields(request("Leo", "Gil", email, null)));
    }

    @Test
    void shouldRejectAPhoneLongerThan30Characters() {
        assertEquals(Set.of("phone"), fields(request("Leo", "Gil", "leo@test.com", "1".repeat(31))));
    }

    @Test
    void shouldReportEveryInvalidFieldAtOnce() {
        assertEquals(Set.of("firstName", "lastName", "email"), fields(request(" ", " ", " ", null)));
    }

    private static UpdateProfileRequest request(String firstName, String lastName, String email, String phone) {
        return new UpdateProfileRequest(firstName, lastName, email, phone);
    }

    private static Set<String> fields(UpdateProfileRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
