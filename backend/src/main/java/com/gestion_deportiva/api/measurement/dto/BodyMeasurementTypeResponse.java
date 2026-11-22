package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;

import java.math.BigDecimal;

// Una medida del catálogo (contrato 17.2). Los rangos y las unidades salen de acá: el front no los hardcodea
public record BodyMeasurementTypeResponse(
        BodyMeasurementType code,
        String name,
        String unit,
        boolean bilateral,
        BigDecimal min,
        BigDecimal max
) {

    public static BodyMeasurementTypeResponse from(BodyMeasurementType type) {
        return new BodyMeasurementTypeResponse(type, type.getDisplayName(), type.getUnit(), type.isBilateral(),
                type.getMinValue(), type.getMaxValue());
    }
}
