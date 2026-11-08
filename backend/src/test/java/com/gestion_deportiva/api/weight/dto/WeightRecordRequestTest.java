package com.gestion_deportiva.api.weight.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.WeightRecordFixtures.DATE;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecordRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// La fecha no futura no se valida acá: depende del reloj y la zona de la app (WeightRecordServiceTest)
class WeightRecordRequestTest {

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
        assertTrue(validator.validate(weightRecordRequest(DATE)).isEmpty());
    }

    @Test
    void shouldAcceptRequestWithoutComment() {
        assertTrue(validator.validate(weightRecordRequest(DATE, "72.5", null)).isEmpty());
    }

    @Test
    void shouldAcceptAFutureDateBecauseTheServiceValidatesIt() {
        assertTrue(validator.validate(weightRecordRequest(LocalDate.of(2999, 1, 1))).isEmpty());
    }

    @Test
    void shouldRejectMissingDateAndWeightWithTheirMessages() {
        // Act
        Set<ConstraintViolation<WeightRecordRequest>> violations =
                validator.validate(weightRecordRequest(null, null, null));

        // Assert
        assertEquals(Set.of("date", "weightKg"), fields(violations));
        assertEquals(Set.of("La fecha es obligatoria", "El peso es obligatorio"), messages(violations));
    }

    @ParameterizedTest
    @ValueSource(strings = {"20", "20.00", "72.5", "299.99", "300", "300.00"})
    void shouldAcceptWeightsWithinTheInclusiveRange(String weightKg) {
        assertTrue(validator.validate(weightRecordRequest(DATE, weightKg, null)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"19.99", "300.01", "0", "-72.5"})
    void shouldRejectWeightsOutOfRange(String weightKg) {
        Set<ConstraintViolation<WeightRecordRequest>> violations =
                validator.validate(weightRecordRequest(DATE, weightKg, null));

        assertEquals(Set.of("weightKg"), fields(violations));
        assertEquals(Set.of("El peso debe estar entre 20 y 300 kg"), messages(violations));
    }

    @Test
    void shouldRejectMoreThanTwoDecimals() {
        Set<ConstraintViolation<WeightRecordRequest>> violations =
                validator.validate(weightRecordRequest(DATE, "72.555", null));

        assertEquals(Set.of("El peso admite hasta 3 enteros y 2 decimales"), messages(violations));
    }

    @Test
    void shouldReportEveryRuleTheWeightBreaks() {
        // 1000.555: fuera de rango y con 4 enteros y 3 decimales
        List<String> weightMessages = validator.validate(weightRecordRequest(DATE, "1000.555", null)).stream()
                .map(ConstraintViolation::getMessage)
                .toList();

        assertEquals(2, weightMessages.size());
        assertTrue(weightMessages.contains("El peso debe estar entre 20 y 300 kg"));
        assertTrue(weightMessages.contains("El peso admite hasta 3 enteros y 2 decimales"));
    }

    @Test
    void shouldAcceptCommentAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(weightRecordRequest(DATE, "72.5", "c".repeat(500))).isEmpty());

        Set<ConstraintViolation<WeightRecordRequest>> violations =
                validator.validate(weightRecordRequest(DATE, "72.5", "c".repeat(501)));
        assertEquals(Set.of("comment"), fields(violations));
        assertEquals(Set.of("El comentario no puede superar los 500 caracteres"), messages(violations));
    }

    @Test
    void shouldCountTheCommentLengthBeforeTrimming() {
        // 498 letras + 3 espacios = 501: se rechaza aunque recortado entraría
        assertEquals(Set.of("comment"),
                fields(validator.validate(weightRecordRequest(DATE, "72.5", " " + "c".repeat(498) + "  "))));
    }

    private static Set<String> fields(Set<ConstraintViolation<WeightRecordRequest>> violations) {
        return violations.stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    private static Set<String> messages(Set<ConstraintViolation<WeightRecordRequest>> violations) {
        return violations.stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
