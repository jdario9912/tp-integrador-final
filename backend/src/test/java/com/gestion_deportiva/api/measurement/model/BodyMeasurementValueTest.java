package com.gestion_deportiva.api.measurement.model;

import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.UUID;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.measurement;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BodyMeasurementValueTest {

    private static final BodyMeasurementRecord RECORD = record(
            athlete("leo@test.com", coach("ana@test.com")), java.time.LocalDate.of(2026, 11, 6));

    @Test
    void shouldStoreTheTypeTheSideAndTheValueWithTwoDecimals() {
        // Act
        BodyMeasurementValue value = measurement(RECORD, BodyMeasurementType.ARM, MeasurementSide.LEFT, "34.8");

        // Assert
        assertEquals(BodyMeasurementType.ARM, value.getType());
        assertEquals(MeasurementSide.LEFT, value.getSide());
        assertEquals(new BigDecimal("34.80"), value.getValue());
        assertEquals(RECORD, value.getRecord());
    }

    @Test
    void shouldStoreNoSideForAUnilateralMeasurement() {
        BodyMeasurementValue value = measurement(RECORD, BodyMeasurementType.WAIST, null, "84.5");

        assertNull(value.getSide());
    }

    // Una bilateral puede llevar solo un lado: el registro lo permite (contrato 17.4)
    @Test
    void shouldAcceptOnlyOneSideOfABilateralMeasurement() {
        assertEquals(MeasurementSide.RIGHT,
                measurement(RECORD, BodyMeasurementType.LEG, MeasurementSide.RIGHT, "55").getSide());
    }

    @Test
    void shouldRejectASideInAUnilateralMeasurement() {
        assertThrows(IllegalArgumentException.class,
                () -> measurement(RECORD, BodyMeasurementType.WAIST, MeasurementSide.LEFT, "84.5"));
    }

    @Test
    void shouldRejectAMissingSideInABilateralMeasurement() {
        assertThrows(IllegalArgumentException.class,
                () -> measurement(RECORD, BodyMeasurementType.ARM, null, "34.8"));
    }

    @ParameterizedTest
    @CsvSource({
            "ARM, 5", "ARM, 100", "LEG, 10", "LEG, 150", "BODY_FAT, 1", "BODY_FAT, 75", "WAIST, 20", "WAIST, 300"
    })
    void shouldAcceptTheRangeLimits(BodyMeasurementType type, String value) {
        BodyMeasurementValue measurement = new BodyMeasurementValue(RECORD, type,
                type.isBilateral() ? MeasurementSide.LEFT : null, new BigDecimal(value));

        assertTrue(type.isWithinRange(measurement.getValue()));
    }

    @ParameterizedTest
    @CsvSource({
            "ARM, 4.99", "ARM, 100.01", "LEG, 9.99", "BODY_FAT, 0.5", "BODY_FAT, 75.01", "WAIST, 19.99", "WAIST, 301"
    })
    void shouldRejectValuesOutsideTheRange(BodyMeasurementType type, String value) {
        assertThrows(IllegalArgumentException.class, () -> new BodyMeasurementValue(RECORD, type,
                type.isBilateral() ? MeasurementSide.LEFT : null, new BigDecimal(value)));
    }

    // numeric(5,2): con más de 2 decimales no se redondea en silencio (80.555 pasaría a 80.56)
    @Test
    void shouldRejectMoreThanTwoDecimalsButAcceptTrailingZeros() {
        assertThrows(IllegalArgumentException.class,
                () -> measurement(RECORD, BodyMeasurementType.WAIST, null, "80.555"));
        assertEquals(new BigDecimal("80.50"), measurement(RECORD, BodyMeasurementType.WAIST, null, "80.500").getValue());
    }

    @Test
    void shouldRequireTheRecordTypeAndValue() {
        assertThrows(NullPointerException.class,
                () -> new BodyMeasurementValue(null, BodyMeasurementType.WAIST, null, new BigDecimal("80")));
        assertThrows(NullPointerException.class,
                () -> new BodyMeasurementValue(RECORD, null, null, new BigDecimal("80")));
        assertThrows(NullPointerException.class,
                () -> new BodyMeasurementValue(RECORD, BodyMeasurementType.WAIST, null, null));
    }

    // equals y hashCode por id, como el resto de las entidades
    @Test
    void shouldCompareByIdOnly() {
        BodyMeasurementValue first = measurement(RECORD, BodyMeasurementType.WAIST, null, "80");
        BodyMeasurementValue second = measurement(RECORD, BodyMeasurementType.WAIST, null, "81");
        assertNotEquals(first, second);

        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(first, "id", id);
        ReflectionTestUtils.setField(second, "id", id);
        assertEquals(first, second);
        assertEquals(first.hashCode(), second.hashCode());
    }
}
