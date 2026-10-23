package com.gestion_deportiva.api.common.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MaxUtf8BytesValidatorTest {

    private MaxUtf8BytesValidator validator;

    @BeforeEach
    void setUp() {
        MaxUtf8Bytes constraint = mock(MaxUtf8Bytes.class);
        when(constraint.value()).thenReturn(4);
        validator = new MaxUtf8BytesValidator();
        validator.initialize(constraint);
    }

    @Test
    void shouldAcceptNull() {
        assertTrue(validator.isValid(null, null));
    }

    @Test
    void shouldAcceptValueAtByteLimit() {
        assertTrue(validator.isValid("abcd", null));
        assertTrue(validator.isValid("ññ", null));
    }

    @Test
    void shouldRejectMultibyteValueOverByteLimitEvenIfCharactersFit() {
        // 4 caracteres, 5 bytes
        assertFalse(validator.isValid("abcñ", null));
    }
}
