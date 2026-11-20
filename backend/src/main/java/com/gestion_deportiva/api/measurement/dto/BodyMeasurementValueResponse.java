package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;

import java.math.BigDecimal;

// Una medida dentro de BodyMeasurementRecordResponse (contrato 17.3.1)
public record BodyMeasurementValueResponse(
        BodyMeasurementType type,
        MeasurementSide side,
        BigDecimal value
) {

    public static BodyMeasurementValueResponse from(BodyMeasurementValue measurement) {
        return new BodyMeasurementValueResponse(measurement.getType(), measurement.getSide(), measurement.getValue());
    }
}
