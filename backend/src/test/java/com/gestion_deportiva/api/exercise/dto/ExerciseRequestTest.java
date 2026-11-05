package com.gestion_deportiva.api.exercise.dto;

import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.ExerciseFixtures.exerciseRequest;
import static com.gestion_deportiva.api.support.ExerciseFixtures.exerciseRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExerciseRequestTest {

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
        assertTrue(validator.validate(exerciseRequest("Press de banca")).isEmpty());
    }

    @Test
    void shouldAcceptRequestWithoutOptionalFields() {
        assertTrue(validator.validate(exerciseRequestWithOnlyRequired("Press de banca")).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "   "})
    void shouldRejectBlankName(String name) {
        assertEquals(Set.of("name"), invalidFields(exerciseRequestWithOnlyRequired(name)));
    }

    @Test
    void shouldRejectEmptyRequiredFields() {
        assertEquals(Set.of("name", "muscleGroup"), invalidFields(new ExerciseRequest(null, null, null, null)));
    }

    @Test
    void shouldAcceptNameAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(exerciseRequestWithOnlyRequired("a".repeat(100))).isEmpty());
        assertEquals(Set.of("name"), invalidFields(exerciseRequestWithOnlyRequired("a".repeat(101))));
    }

    @Test
    void shouldAcceptDescriptionAtMaxLengthAndRejectLonger() {
        assertTrue(validator.validate(withDescription("d".repeat(500))).isEmpty());
        assertEquals(Set.of("description"), invalidFields(withDescription("d".repeat(501))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "http://video.com", "https://www.youtube.com/watch?v=abc", "HTTPS://VIMEO.COM/1",
            "https://youtu.be/abc?t=10#x"})
    void shouldAcceptValidOrEmptyVideoUrl(String url) {
        assertTrue(validator.validate(withVideoUrl(url)).isEmpty(), url);
    }

    @ParameterizedTest
    @ValueSource(strings = {" ", "www.youtube.com/watch", "youtube", "ftp://video.com/a.mp4",
            "javascript:alert(1)", "https://", "https:// video.com", "https://video.com/a b"})
    void shouldRejectInvalidVideoUrl(String url) {
        assertEquals(Set.of("videoUrl"), invalidFields(withVideoUrl(url)), url);
    }

    @Test
    void shouldRejectVideoUrlLongerThan500Characters() {
        String prefix = "https://video.com/";
        assertTrue(validator.validate(withVideoUrl(prefix + "a".repeat(500 - prefix.length()))).isEmpty());
        assertEquals(Set.of("videoUrl"), invalidFields(withVideoUrl(prefix + "a".repeat(501 - prefix.length()))));
    }

    private static ExerciseRequest withDescription(String description) {
        return new ExerciseRequest("Press", MuscleGroup.CHEST, description, null);
    }

    private static ExerciseRequest withVideoUrl(String videoUrl) {
        return new ExerciseRequest("Press", MuscleGroup.CHEST, null, videoUrl);
    }

    private static Set<String> invalidFields(ExerciseRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
