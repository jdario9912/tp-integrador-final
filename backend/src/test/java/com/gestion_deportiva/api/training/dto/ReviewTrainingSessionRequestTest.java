package com.gestion_deportiva.api.training.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Body de la revisión (US-21, contrato 15.4): la observación se recorta, una vacía es null y el largo se mide después
// de recortar, con tope de 1000
class ReviewTrainingSessionRequestTest {

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
    void shouldAcceptAMissingObservation() {
        ReviewTrainingSessionRequest request = new ReviewTrainingSessionRequest(null);

        assertNull(request.observation());
        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void shouldTurnABlankObservationIntoNull() {
        assertNull(new ReviewTrainingSessionRequest("").observation());
        assertNull(new ReviewTrainingSessionRequest("   \t ").observation());
    }

    @Test
    void shouldTrimTheObservation() {
        assertEquals("Buen trabajo", new ReviewTrainingSessionRequest("  Buen trabajo \n").observation());
    }

    @Test
    void shouldAcceptExactlyAThousandCharacters() {
        ReviewTrainingSessionRequest request = new ReviewTrainingSessionRequest("a".repeat(1000));

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void shouldRejectMoreThanAThousandCharacters() {
        ReviewTrainingSessionRequest request = new ReviewTrainingSessionRequest("a".repeat(1001));

        Set<ConstraintViolation<ReviewTrainingSessionRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<ReviewTrainingSessionRequest> violation = violations.iterator().next();
        assertEquals("observation", violation.getPropertyPath().toString());
        assertEquals("La observación no puede superar los 1000 caracteres", violation.getMessage());
    }

    @Test
    void shouldMeasureTheLengthAfterTrimming() {
        // 1000 caracteres con espacios de sobra: recortada, entra
        ReviewTrainingSessionRequest request = new ReviewTrainingSessionRequest("  " + "a".repeat(1000) + "   ");

        assertTrue(validator.validate(request).isEmpty());
    }
}
