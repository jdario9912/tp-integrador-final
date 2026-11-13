package com.gestion_deportiva.api.training.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.TrainingSessionFixtures.startRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Que el día sea de la rutina activa no se valida acá: lo decide TrainingSessionService (422)
class StartTrainingSessionRequestTest {

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
    void shouldAcceptARequestWithTheDay() {
        assertTrue(validator.validate(startRequest(UUID.randomUUID())).isEmpty());
    }

    @Test
    void shouldRejectAMissingDayWithItsMessage() {
        // Act
        Set<ConstraintViolation<StartTrainingSessionRequest>> violations = validator.validate(startRequest(null));

        // Assert
        assertEquals(1, violations.size());
        ConstraintViolation<StartTrainingSessionRequest> violation = violations.iterator().next();
        assertEquals("routineDayId", violation.getPropertyPath().toString());
        assertEquals("El día de la rutina es obligatorio", violation.getMessage());
    }
}
