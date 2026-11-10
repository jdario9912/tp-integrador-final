package com.gestion_deportiva.api.routine.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.RoutineFixtures.day;
import static com.gestion_deportiva.api.support.RoutineFixtures.exerciseRequest;
import static com.gestion_deportiva.api.support.RoutineFixtures.exerciseRequestWithOnlyRequired;
import static com.gestion_deportiva.api.support.RoutineFixtures.structure;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutineStructureRequestTest {

    private static final UUID EXERCISE_ID = UUID.randomUUID();

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
    void shouldAcceptCompleteStructure() {
        assertTrue(validator.validate(structure(
                day(null, "Empuje", exerciseRequest(null, EXERCISE_ID)),
                day(null, "Tirón", exerciseRequestWithOnlyRequired(null, EXERCISE_ID)))).isEmpty());
    }

    @Test
    void shouldAcceptNoDaysAndDaysWithoutExercises() {
        assertTrue(validator.validate(structure()).isEmpty());
        assertTrue(validator.validate(structure(day(null, "Empuje"))).isEmpty());
        assertTrue(validator.validate(structure(new RoutineDayRequest(null, "Empuje", null))).isEmpty());
    }

    @Test
    void shouldRejectMissingDays() {
        assertEquals(Set.of("days"), invalidFields(new RoutineStructureRequest(null)));
    }

    @Test
    void shouldAcceptUpToSevenDaysAndRejectMore() {
        assertTrue(validator.validate(new RoutineStructureRequest(days(7))).isEmpty());
        assertEquals(Set.of("days"), invalidFields(new RoutineStructureRequest(days(8))));
    }

    @Test
    void shouldAcceptUpToThirtyExercisesPerDayAndRejectMore() {
        assertTrue(validator.validate(structure(new RoutineDayRequest(null, "Empuje", exercises(30)))).isEmpty());
        assertEquals(Set.of("days[0].exercises"),
                invalidFields(structure(new RoutineDayRequest(null, "Empuje", exercises(31)))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " "})
    void shouldRejectBlankDayName(String name) {
        assertEquals(Set.of("days[0].name"), invalidFields(structure(day(null, name))));
    }

    @Test
    void shouldRejectDayNameLongerThan100Characters() {
        assertTrue(validator.validate(structure(day(null, "a".repeat(100)))).isEmpty());
        assertEquals(Set.of("days[0].name"), invalidFields(structure(day(null, "a".repeat(101)))));
    }

    // Bean Validation nombra así al elemento de la lista; Spring lo expone como "days[0]" en fieldErrors
    @Test
    void shouldRejectNullDayOrExercise() {
        assertEquals(Set.of("days[0].<list element>"),
                invalidFields(new RoutineStructureRequest(Collections.singletonList(null))));
        assertEquals(Set.of("days[0].exercises[0].<list element>"),
                invalidFields(structure(new RoutineDayRequest(null, "Empuje", Collections.singletonList(null)))));
    }

    @Test
    void shouldRejectMissingRequiredExerciseFields() {
        RoutineExerciseRequest empty = new RoutineExerciseRequest(null, null, null, null, null, null, null, null);

        assertEquals(Set.of("days[0].exercises[0].exerciseId", "days[0].exercises[0].sets",
                "days[0].exercises[0].reps"), invalidFields(structure(day(null, "Empuje", empty))));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 100})
    void shouldRejectSetsOutOfRange(int sets) {
        assertEquals(Set.of("days[0].exercises[0].sets"), invalidFields(withExercise(
                new RoutineExerciseRequest(null, EXERCISE_ID, sets, 10, null, null, null, null))));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 1000})
    void shouldRejectRepsOutOfRange(int reps) {
        assertEquals(Set.of("days[0].exercises[0].reps"), invalidFields(withExercise(
                new RoutineExerciseRequest(null, EXERCISE_ID, 3, reps, null, null, null, null))));
    }

    @Test
    void shouldAcceptTheLimitsOfSetsRepsWeightAndRest() {
        assertTrue(validator.validate(withExercise(new RoutineExerciseRequest(null, EXERCISE_ID, 1, 1,
                BigDecimal.ZERO, 0, null, null))).isEmpty());
        assertTrue(validator.validate(withExercise(new RoutineExerciseRequest(null, EXERCISE_ID, 99, 999,
                new BigDecimal("1000"), 3600, null, null))).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-0.5", "1000.01", "60.555"})
    void shouldRejectInvalidRecommendedWeight(String weight) {
        assertEquals(Set.of("days[0].exercises[0].recommendedWeight"), invalidFields(withExercise(
                new RoutineExerciseRequest(null, EXERCISE_ID, 3, 10, new BigDecimal(weight), null, null, null))));
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 3601})
    void shouldRejectRestOutOfRange(int rest) {
        assertEquals(Set.of("days[0].exercises[0].rest"), invalidFields(withExercise(
                new RoutineExerciseRequest(null, EXERCISE_ID, 3, 10, null, rest, null, null))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"RPE 11", "RIR 11", "RPE 0", "fácil"})
    void shouldRejectInvalidRirRpe(String rirRpe) {
        assertEquals(Set.of("days[0].exercises[0].rirRpe"), invalidFields(withExercise(
                new RoutineExerciseRequest(null, EXERCISE_ID, 3, 10, null, null, rirRpe, null))));
    }

    @Test
    void shouldRejectTechniqueNoteLongerThan500Characters() {
        assertTrue(validator.validate(withExercise(new RoutineExerciseRequest(null, EXERCISE_ID, 3, 10, null, null,
                null, "a".repeat(500)))).isEmpty());
        assertEquals(Set.of("days[0].exercises[0].techniqueNote"), invalidFields(withExercise(
                new RoutineExerciseRequest(null, EXERCISE_ID, 3, 10, null, null, null, "a".repeat(501)))));
    }

    private static RoutineStructureRequest withExercise(RoutineExerciseRequest exercise) {
        return structure(day(null, "Empuje", exercise));
    }

    private static List<RoutineDayRequest> days(int count) {
        List<RoutineDayRequest> days = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            days.add(day(null, "Día " + (i + 1)));
        }
        return days;
    }

    private static List<RoutineExerciseRequest> exercises(int count) {
        List<RoutineExerciseRequest> exercises = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            exercises.add(exerciseRequestWithOnlyRequired(null, EXERCISE_ID));
        }
        return exercises;
    }

    private static Set<String> invalidFields(RoutineStructureRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
