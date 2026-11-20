package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

// El catálogo que devuelve GET /api/body-measurement-types (contrato 17.2)
class BodyMeasurementTypeResponseTest {

    @Test
    void shouldExposeTheCatalogFieldsOfTheType() {
        BodyMeasurementTypeResponse arm = BodyMeasurementTypeResponse.from(BodyMeasurementType.ARM);

        assertEquals(new BodyMeasurementTypeResponse(BodyMeasurementType.ARM, "Brazo", "cm", true,
                new BigDecimal("5"), new BigDecimal("100")), arm);
    }

    @Test
    void shouldListEverySpecifiedMeasurementInCatalogOrder() {
        List<BodyMeasurementType> codes = Arrays.stream(BodyMeasurementType.values())
                .map(BodyMeasurementTypeResponse::from)
                .map(BodyMeasurementTypeResponse::code)
                .toList();

        assertEquals(List.of(BodyMeasurementType.WAIST, BodyMeasurementType.CHEST, BodyMeasurementType.HIP,
                BodyMeasurementType.ARM, BodyMeasurementType.LEG, BodyMeasurementType.BODY_FAT), codes);
    }
}
