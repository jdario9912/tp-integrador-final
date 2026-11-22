package com.gestion_deportiva.api.measurement.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.DATE;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.recordRequest;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.valueRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// La fecha no futura no se valida acá: depende del reloj y la zona de la app (BodyMeasurementServiceImplTest)
class BodyMeasurementRecordRequestTest {

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
    void shouldAcceptACompleteRequest() {
        BodyMeasurementRecordRequest request = recordRequest(DATE, "Después de entrenar",
                valueRequest(BodyMeasurementType.WAIST, null, "84.5"),
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "34.8"),
                valueRequest(BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35.25"));

        assertTrue(errors(request).isEmpty());
    }

    // Un solo lado de una bilateral es válido (criterio de D-028)
    @Test
    void shouldAcceptOneSideOfABilateralMeasurement() {
        assertTrue(errors(recordRequest(DATE, valueRequest(BodyMeasurementType.LEG, MeasurementSide.RIGHT, "55")))
                .isEmpty());
    }

    @Test
    void shouldAcceptAFutureDateBecauseTheServiceValidatesIt() {
        assertTrue(errors(recordRequest(LocalDate.of(2999, 1, 1), valueRequest(BodyMeasurementType.WAIST, null, "80")))
                .isEmpty());
    }

    @Test
    void shouldRejectMissingDateAndAnEmptyListOfValues() {
        assertEquals(Set.of("date: La fecha es obligatoria", "values: Indique al menos una medida"),
                errors(recordRequest(null)));
        assertEquals(Set.of("values: Indique al menos una medida"),
                errors(new BodyMeasurementRecordRequest(DATE, null, null)));
    }

    @Test
    void shouldRejectACommentLongerThan500Characters() {
        assertEquals(Set.of("comment: El comentario no puede superar los 500 caracteres"),
                errors(recordRequest(DATE, "x".repeat(501), valueRequest(BodyMeasurementType.WAIST, null, "80"))));
        assertTrue(errors(recordRequest(DATE, "x".repeat(500), valueRequest(BodyMeasurementType.WAIST, null, "80")))
                .isEmpty());
    }

    @Test
    void shouldRejectTheSameTypeAndSideTwice() {
        assertEquals(Set.of("values: Hay dos medidas del mismo tipo y lado"),
                errors(recordRequest(DATE,
                        valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "34"),
                        valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "35"))));
    }

    @Test
    void shouldRejectTheSameUnilateralTypeTwice() {
        assertEquals(Set.of("values: Hay dos medidas del mismo tipo y lado"),
                errors(recordRequest(DATE,
                        valueRequest(BodyMeasurementType.WAIST, null, "84"),
                        valueRequest(BodyMeasurementType.WAIST, null, "85"))));
    }

    @Test
    void shouldRejectABilateralMeasurementWithoutSide() {
        assertEquals(Set.of("values[0].side: Indique el lado de la medida (LEFT o RIGHT)"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.ARM, null, "34"))));
    }

    @Test
    void shouldRejectASideInAUnilateralMeasurement() {
        assertEquals(Set.of("values[0].side: Esta medida no admite lado"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.CHEST, MeasurementSide.LEFT, "100"))));
    }

    @Test
    void shouldRejectAMissingTypeAndAMissingValue() {
        assertEquals(Set.of("values[0].type: El tipo de medida es obligatorio"),
                errors(recordRequest(DATE, valueRequest(null, null, "80"))));
        assertEquals(Set.of("values[0].value: El valor es obligatorio"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.WAIST, null, null))));
    }

    @Test
    void shouldRejectAValueOutsideTheRangeOfItsMeasurement() {
        assertEquals(Set.of("values[0].value: El valor debe estar entre 5 y 100"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.ARM, MeasurementSide.LEFT, "150"))));
        assertEquals(Set.of("values[0].value: El valor debe estar entre 1 y 75"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.BODY_FAT, null, "75.01"))));
    }

    // Cero o negativo: el error es "mayor a 0" y no se repite con el rango
    @ParameterizedTest
    @CsvSource({"0", "-1", "-0.5"})
    void shouldRejectZeroOrNegativeValuesWithOnlyTheSignMessage(String value) {
        assertEquals(Set.of("values[0].value: El valor debe ser mayor a 0"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.WAIST, null, value))));
    }

    @Test
    void shouldRejectMoreThanTwoDecimals() {
        assertEquals(Set.of("values[0].value: El valor admite hasta 3 enteros y 2 decimales"),
                errors(recordRequest(DATE, valueRequest(BodyMeasurementType.WAIST, null, "84.555"))));
    }

    @Test
    void shouldRejectMoreThanThreeIntegerDigits() {
        Set<String> errors = errors(recordRequest(DATE, valueRequest(BodyMeasurementType.WAIST, null, "1000")));

        assertTrue(errors.contains("values[0].value: El valor admite hasta 3 enteros y 2 decimales"), errors.toString());
        assertTrue(errors.contains("values[0].value: El valor debe estar entre 20 y 300"), errors.toString());
    }

    // Los rangos de la tabla son inclusive en los dos extremos de cada medida
    @ParameterizedTest
    @EnumSource(BodyMeasurementType.class)
    void shouldAcceptTheRangeLimitsOfEveryMeasurement(BodyMeasurementType type) {
        MeasurementSide side = type.isBilateral() ? MeasurementSide.LEFT : null;
        assertTrue(errors(recordRequest(DATE, valueRequest(type, side, type.getMinValue().toPlainString())))
                .isEmpty());
        assertTrue(errors(recordRequest(DATE, valueRequest(type, side, type.getMaxValue().toPlainString())))
                .isEmpty());
    }

    // Un elemento nulo en la lista es un 400 (y no un NPE del service). Hibernate Validator lo ubica en
    // "<list element>" porque la restricción es del elemento de la lista, no de un campo
    @Test
    void shouldRejectAValueListWithANullElement() {
        BodyMeasurementRecordRequest request = new BodyMeasurementRecordRequest(DATE, null, java.util.Arrays.asList(
                (BodyMeasurementValueRequest) null));

        assertEquals(Set.of("values[0].<list element>: La medida no puede estar vacía"), errors(request));
    }

    @Test
    void shouldAcceptTheDecimalValueOfEachMeasurementWithinItsRange() {
        assertTrue(errors(recordRequest(DATE, valueRequest(BodyMeasurementType.HIP, null, "99.99"),
                valueRequest(BodyMeasurementType.LEG, MeasurementSide.RIGHT, new BigDecimal("55.5").toPlainString())))
                .isEmpty());
    }

    // "campo: mensaje" de cada violación, para comparar conjuntos enteros
    private Set<String> errors(BodyMeasurementRecordRequest request) {
        Set<ConstraintViolation<BodyMeasurementRecordRequest>> violations = validator.validate(request);
        return violations.stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.toSet());
    }
}
