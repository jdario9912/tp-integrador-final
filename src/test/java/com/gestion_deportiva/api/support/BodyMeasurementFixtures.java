package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordRequest;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementValueRequest;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

// Datos de prueba reutilizables para las medidas corporales (US-45). Los valores llegan como String para que se lean
// como en el JSON ("84.5"); null = la medida no se manda
public final class BodyMeasurementFixtures {

    // Momento del alta de los registros armados con record(...)
    public static final Instant CREATED_AT = Instant.parse("2026-11-01T12:00:00Z");

    // Fecha pasada fija: nunca es futura, corra cuando corra el test
    public static final LocalDate DATE = LocalDate.of(2026, 1, 10);

    private BodyMeasurementFixtures() {
    }

    public static BodyMeasurementRecord record(Athlete athlete, LocalDate date) {
        return new BodyMeasurementRecord(athlete, date, null, CREATED_AT);
    }

    public static BodyMeasurementRecord record(Athlete athlete, LocalDate date, String comment) {
        return new BodyMeasurementRecord(athlete, date, comment, CREATED_AT);
    }

    public static BodyMeasurementValue measurement(BodyMeasurementRecord record, BodyMeasurementType type,
                                                   MeasurementSide side, String value) {
        return new BodyMeasurementValue(record, type, side, new BigDecimal(value));
    }

    public static BodyMeasurementValueRequest valueRequest(BodyMeasurementType type, MeasurementSide side,
                                                           String value) {
        return new BodyMeasurementValueRequest(type, side, value == null ? null : new BigDecimal(value));
    }

    // Request con la lista de medidas que se pase (sin medidas: lista vacía)
    public static BodyMeasurementRecordRequest recordRequest(LocalDate date, BodyMeasurementValueRequest... values) {
        return new BodyMeasurementRecordRequest(date, null, List.of(values));
    }

    public static BodyMeasurementRecordRequest recordRequest(LocalDate date, String comment,
                                                             BodyMeasurementValueRequest... values) {
        return new BodyMeasurementRecordRequest(date, comment, List.of(values));
    }
}
