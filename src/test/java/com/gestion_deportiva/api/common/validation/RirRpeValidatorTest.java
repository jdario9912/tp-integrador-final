package com.gestion_deportiva.api.common.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RirRpeValidatorTest {

    private final RirRpeValidator validator = new RirRpeValidator();

    @Test
    void shouldAcceptNullAndBlankBecauseTheFieldIsOptional() {
        assertTrue(validator.isValid(null, null));
        assertTrue(validator.isValid("", null));
        assertTrue(validator.isValid("   ", null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"RIR 0", "RIR 2", "RIR 10", "rir 3", " RIR 1 ", "RIR2", "RPE 1", "RPE 8", "RPE 8.5",
            "RPE 10", "rpe 9.5", "RPE  7"})
    void shouldAcceptRirAndRpeWithinTheirRanges(String value) {
        assertTrue(validator.isValid(value, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"RIR 11", "RIR -1", "RIR 2.5", "RPE 0", "RPE 0.5", "RPE 10.5", "RPE 11", "RPE 8.3",
            "RIR", "RPE", "8", "RIR dos", "RIRE 2", "RPE 8,5", "RIR 2 RPE 8"})
    void shouldRejectValuesOutOfRangeOrWithAnotherFormat(String value) {
        assertFalse(validator.isValid(value, null));
    }
}
