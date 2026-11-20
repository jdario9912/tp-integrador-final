package com.gestion_deportiva.api.measurement.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BodyMeasurementSearchFilterTest {

    private static final LocalDate NOV_1 = LocalDate.of(2026, 11, 1);
    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);

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
    void shouldAcceptAnOpenOrAClosedRange() {
        assertTrue(validator.validate(new BodyMeasurementSearchFilter(null, null)).isEmpty());
        assertTrue(validator.validate(new BodyMeasurementSearchFilter(NOV_1, null)).isEmpty());
        assertTrue(validator.validate(new BodyMeasurementSearchFilter(null, NOV_6)).isEmpty());
        assertTrue(validator.validate(new BodyMeasurementSearchFilter(NOV_1, NOV_6)).isEmpty());
    }

    // from igual a to es un solo día y es válido
    @Test
    void shouldAcceptFromEqualToTo() {
        assertTrue(validator.validate(new BodyMeasurementSearchFilter(NOV_6, NOV_6)).isEmpty());
    }

    // El error va al campo "from", igual que en el peso (contrato 17.9)
    @Test
    void shouldRejectFromAfterToOnTheFromField() {
        var violations = validator.validate(new BodyMeasurementSearchFilter(NOV_6, NOV_1));

        assertEquals(1, violations.size());
        var violation = violations.iterator().next();
        assertEquals("from", violation.getPropertyPath().toString());
        assertEquals("La fecha desde no puede ser posterior a la fecha hasta", violation.getMessage());
    }
}
