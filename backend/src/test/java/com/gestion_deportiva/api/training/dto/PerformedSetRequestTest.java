package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.training.model.enums.SetStatus;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Reglas del body de una serie (US-19, contrato 11.3): el campo de cada error sale en fieldErrors
class PerformedSetRequestTest {

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

    // ---------- realizada ----------

    @Test
    void shouldAcceptADoneSetWithWeightRepsAndRpe() {
        assertTrue(errors(done("62.5", 8, 8)).isEmpty());
    }

    @Test
    void shouldAcceptADoneSetWithoutRpe() {
        assertTrue(errors(done("60", 10, null)).isEmpty());
    }

    @Test
    void shouldAcceptTheLimitsOfWeightRepsAndRpe() {
        assertTrue(errors(done("0", 1, 1)).isEmpty());
        assertTrue(errors(done("9999.99", 999, 10)).isEmpty());
        assertTrue(errors(done("100", 5, null)).isEmpty()); // 100 sin decimales
    }

    @Test
    void shouldAskForWeightAndRepsOfADoneSet() {
        assertEquals("Ingresá el peso de una serie realizada", errors(done(null, 8, null)).get("weight"));
        assertEquals("Ingresá las repeticiones de una serie realizada", errors(done("60", null, null)).get("reps"));
    }

    @Test
    void shouldRejectANegativeWeight() {
        assertEquals("El peso no puede ser negativo", errors(done("-0.5", 8, null)).get("weight"));
    }

    @Test
    void shouldRejectAWeightOverTheLimitOrWithMoreThanTwoDecimals() {
        assertEquals("El peso debe estar entre 0 y 9999,99", errors(done("10000", 8, null)).get("weight"));
        assertEquals("El peso debe estar entre 0 y 9999,99", errors(done("60.125", 8, null)).get("weight"));
    }

    @Test
    void shouldRejectRepsOutsideOneToNineHundredNinetyNine() {
        assertEquals("Las repeticiones deben estar entre 1 y 999", errors(done("60", 0, null)).get("reps"));
        assertEquals("Las repeticiones deben estar entre 1 y 999", errors(done("60", 1000, null)).get("reps"));
    }

    @Test
    void shouldRejectRpeOutsideOneToTen() {
        assertEquals("El RPE debe estar entre 1 y 10", errors(done("60", 8, 0)).get("rpe"));
        assertEquals("El RPE debe estar entre 1 y 10", errors(done("60", 8, 11)).get("rpe"));
    }

    @Test
    void shouldReportEveryWrongFieldOfADoneSet() {
        Map<String, String> errors = errors(done(null, 0, 11));

        assertEquals(3, errors.size());
        assertTrue(errors.containsKey("weight"));
        assertTrue(errors.containsKey("reps"));
        assertTrue(errors.containsKey("rpe"));
    }

    @Test
    void shouldIgnoreTheSkipReasonOfADoneSet() {
        assertTrue(errors(new PerformedSetRequest(SetStatus.DONE, new BigDecimal("60"), 8, null, "x".repeat(300)))
                .isEmpty());
    }

    // ---------- omitida ----------

    @Test
    void shouldAcceptASkippedSetWithItsReason() {
        assertTrue(errors(skipped("Dolor de rodilla")).isEmpty());
    }

    @Test
    void shouldDiscardWeightRepsAndRpeOfASkippedSetWithoutErrors() {
        PerformedSetRequest request = new PerformedSetRequest(SetStatus.SKIPPED, new BigDecimal("-5"), 0, 99,
                "Sin tiempo");

        assertTrue(errors(request).isEmpty());
    }

    @Test
    void shouldAskForTheReasonOfASkippedSet() {
        assertEquals("Ingresá el motivo de una serie omitida", errors(skipped(null)).get("skipReason"));
        assertEquals("Ingresá el motivo de una serie omitida", errors(skipped("   ")).get("skipReason"));
    }

    @Test
    void shouldRejectAReasonOver200Characters() {
        assertEquals("El motivo no puede superar los 200 caracteres",
                errors(skipped("x".repeat(201))).get("skipReason"));
    }

    @Test
    void shouldCountTheReasonAfterTrimmingIt() {
        assertTrue(errors(skipped("  " + "x".repeat(200) + "  ")).isEmpty());
    }

    // ---------- sin estado ----------

    @Test
    void shouldOnlyAskForTheStatusWhenItIsMissing() {
        PerformedSetRequest request = new PerformedSetRequest(null, null, null, null, null);

        Map<String, String> errors = errors(request);

        assertEquals(Map.of("status", "Ingresá el estado de la serie"), errors);
    }

    // ---------- helpers ----------

    private static PerformedSetRequest done(String weight, Integer reps, Integer rpe) {
        return new PerformedSetRequest(SetStatus.DONE, weight == null ? null : new BigDecimal(weight), reps, rpe,
                null);
    }

    private static PerformedSetRequest skipped(String reason) {
        return new PerformedSetRequest(SetStatus.SKIPPED, null, null, null, reason);
    }

    private static Map<String, String> errors(PerformedSetRequest request) {
        Set<ConstraintViolation<PerformedSetRequest>> violations = validator.validate(request);
        return violations.stream().collect(Collectors.toMap(
                violation -> violation.getPropertyPath().toString(),
                ConstraintViolation::getMessage));
    }
}
