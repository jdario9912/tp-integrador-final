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

// US-48 · Reglas de Bean Validation del cambio de contraseña (contrato 18.5). La nueva tiene la política del alta: al
// menos 8 caracteres y como máximo 72 bytes UTF-8
class ChangePasswordRequestTest {

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
    void shouldAcceptAValidChange() {
        assertTrue(validator.validate(request("password123", "nueva-clave-2026")).isEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankCurrentPassword(String current) {
        assertEquals(Set.of("currentPassword"), fields(request(current, "nueva-clave-2026")));
    }

    @Test
    void shouldNotRequireAMinimumLengthForTheCurrentPassword() {
        // Una actual corta incorrecta responde "no es correcta" (lo decide el service), no una regla de longitud
        assertTrue(validator.validate(request("abc", "nueva-clave-2026")).isEmpty());
    }

    @Test
    void shouldRejectACurrentPasswordOver72Bytes() {
        assertEquals(Set.of("currentPassword"), fields(request("a".repeat(73), "nueva-clave-2026")));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void shouldRejectABlankNewPassword(String newPassword) {
        assertEquals(Set.of("newPassword"), fields(request("password123", newPassword)));
    }

    @Test
    void shouldRejectANewPasswordShorterThan8Characters() {
        assertEquals(Set.of("newPassword"), fields(request("password123", "corta12")));
    }

    @Test
    void shouldAccept8CharactersAsNewPassword() {
        assertTrue(validator.validate(request("password123", "12345678")).isEmpty());
    }

    @Test
    void shouldCountBytesNotCharactersForTheNewPassword() {
        // 36 "ñ" son 36 caracteres pero 72 bytes; 37 superan el límite
        assertTrue(validator.validate(request("password123", "ñ".repeat(36))).isEmpty());
        assertEquals(Set.of("newPassword"), fields(request("password123", "ñ".repeat(37))));
    }

    @Test
    void shouldReportBothFieldsWhenBothAreInvalid() {
        assertEquals(Set.of("currentPassword", "newPassword"), fields(request("", "corta")));
    }

    private static ChangePasswordRequest request(String currentPassword, String newPassword) {
        return new ChangePasswordRequest(currentPassword, newPassword);
    }

    private static Set<String> fields(ChangePasswordRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
