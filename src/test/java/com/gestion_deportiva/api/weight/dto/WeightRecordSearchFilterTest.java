package com.gestion_deportiva.api.weight.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Cubre también @ValidDateRange: el error se registra en "from" para que el handler lo devuelva en fieldErrors
class WeightRecordSearchFilterTest {

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
    void shouldAcceptAnOrderedRangeOrASingleDay() {
        assertTrue(validator.validate(new WeightRecordSearchFilter(NOV_1, NOV_6)).isEmpty());
        assertTrue(validator.validate(new WeightRecordSearchFilter(NOV_6, NOV_6)).isEmpty());
    }

    @Test
    void shouldAcceptAnOpenRange() {
        assertTrue(validator.validate(new WeightRecordSearchFilter(null, null)).isEmpty());
        assertTrue(validator.validate(new WeightRecordSearchFilter(NOV_6, null)).isEmpty());
        assertTrue(validator.validate(new WeightRecordSearchFilter(null, NOV_1)).isEmpty());
    }

    @Test
    void shouldRejectFromAfterToOnTheFromField() {
        // Act
        Set<ConstraintViolation<WeightRecordSearchFilter>> violations =
                validator.validate(new WeightRecordSearchFilter(NOV_6, NOV_1));

        // Assert
        assertEquals(1, violations.size());
        ConstraintViolation<WeightRecordSearchFilter> violation = violations.iterator().next();
        assertEquals("from", violation.getPropertyPath().toString());
        assertEquals("La fecha desde no puede ser posterior a la fecha hasta", violation.getMessage());
    }
}
