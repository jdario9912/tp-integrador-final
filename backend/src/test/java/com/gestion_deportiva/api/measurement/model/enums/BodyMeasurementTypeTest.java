package com.gestion_deportiva.api.measurement.model.enums;

import com.gestion_deportiva.api.measurement.model.enums.converter.BodyMeasurementTypeConverter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.math.BigDecimal;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Que el enum coincida con la tabla body_measurement_types lo controla CatalogSchemaTest (integración)
class BodyMeasurementTypeTest {

    // El catálogo se muestra en este orden (contrato 17.2): el orden de las constantes no puede cambiar
    @Test
    void shouldKeepTheCatalogOrderAndTheIds() {
        assertEquals(
                Arrays.asList("WAIST", "CHEST", "HIP", "ARM", "LEG", "BODY_FAT"),
                Arrays.stream(BodyMeasurementType.values()).map(Enum::name).toList());
        for (int i = 0; i < BodyMeasurementType.values().length; i++) {
            assertEquals((short) (i + 1), BodyMeasurementType.values()[i].getId());
        }
    }

    // Documenta el catálogo de la tabla: unidad, bilateralidad y rango de cada medida (contrato 17.2)
    @Test
    void shouldHaveTheUnitsSidesAndRangesOfTheCatalog() {
        assertMeasurement(BodyMeasurementType.WAIST, "Cintura", "cm", false, "20", "300");
        assertMeasurement(BodyMeasurementType.CHEST, "Pecho", "cm", false, "20", "300");
        assertMeasurement(BodyMeasurementType.HIP, "Cadera", "cm", false, "20", "300");
        assertMeasurement(BodyMeasurementType.ARM, "Brazo", "cm", true, "5", "100");
        assertMeasurement(BodyMeasurementType.LEG, "Pierna (muslo)", "cm", true, "10", "150");
        assertMeasurement(BodyMeasurementType.BODY_FAT, "% de grasa", "%", false, "1", "75");
    }

    @Test
    void shouldAcceptBothSidesOnlyInTheBilateralMeasurements() {
        assertTrue(BodyMeasurementType.ARM.acceptsSide(MeasurementSide.LEFT));
        assertTrue(BodyMeasurementType.ARM.acceptsSide(MeasurementSide.RIGHT));
        assertFalse(BodyMeasurementType.ARM.acceptsSide(null));

        assertTrue(BodyMeasurementType.WAIST.acceptsSide(null));
        assertFalse(BodyMeasurementType.WAIST.acceptsSide(MeasurementSide.LEFT));
        assertFalse(BodyMeasurementType.WAIST.acceptsSide(MeasurementSide.RIGHT));
    }

    // Los extremos del rango son válidos (inclusive); lo que queda fuera, no
    @ParameterizedTest
    @EnumSource(BodyMeasurementType.class)
    void shouldAcceptTheRangeLimitsAndRejectWhatIsOutside(BodyMeasurementType type) {
        assertTrue(type.isWithinRange(type.getMinValue()));
        assertTrue(type.isWithinRange(type.getMaxValue()));
        assertFalse(type.isWithinRange(type.getMinValue().subtract(new BigDecimal("0.01"))));
        assertFalse(type.isWithinRange(type.getMaxValue().add(new BigDecimal("0.01"))));
    }

    @Test
    void shouldFindEveryConstantByItsIdAndRejectAnUnknownOne() {
        Arrays.stream(BodyMeasurementType.values())
                .forEach(type -> assertEquals(type, BodyMeasurementType.fromId(type.getId())));
        assertThrows(IllegalArgumentException.class, () -> BodyMeasurementType.fromId((short) 7));
    }

    @Test
    void converterStoresTheIdAndReadsItBack() {
        BodyMeasurementTypeConverter converter = new BodyMeasurementTypeConverter();

        assertEquals((short) 4, converter.convertToDatabaseColumn(BodyMeasurementType.ARM));
        assertEquals(BodyMeasurementType.BODY_FAT, converter.convertToEntityAttribute((short) 6));
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute((short) 99));
    }

    private static void assertMeasurement(BodyMeasurementType type, String displayName, String unit,
                                          boolean bilateral, String min, String max) {
        assertEquals(displayName, type.getDisplayName());
        assertEquals(unit, type.getUnit());
        assertEquals(bilateral, type.isBilateral());
        assertEquals(0, new BigDecimal(min).compareTo(type.getMinValue()), type.name());
        assertEquals(0, new BigDecimal(max).compareTo(type.getMaxValue()), type.name());
    }
}
