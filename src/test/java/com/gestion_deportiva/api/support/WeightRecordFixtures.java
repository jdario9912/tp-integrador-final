package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.weight.dto.WeightRecordRequest;
import com.gestion_deportiva.api.weight.model.WeightRecord;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

// Datos de prueba reutilizables para los registros de peso (US-26)
public final class WeightRecordFixtures {

    // Momento del alta de los registros armados con weightRecord(...)
    public static final Instant CREATED_AT = Instant.parse("2026-11-01T12:00:00Z");

    // Fecha pasada fija: nunca es futura, corra cuando corra el test
    public static final LocalDate DATE = LocalDate.of(2026, 1, 10);

    private WeightRecordFixtures() {
    }

    public static WeightRecord weightRecord(Athlete athlete, LocalDate date, String weightKg) {
        return new WeightRecord(athlete, date, new BigDecimal(weightKg), null, CREATED_AT);
    }

    public static WeightRecord weightRecord(Athlete athlete, LocalDate date, String weightKg, String comment) {
        return new WeightRecord(athlete, date, new BigDecimal(weightKg), comment, CREATED_AT);
    }

    // Request válido con todos los campos completos
    public static WeightRecordRequest weightRecordRequest(LocalDate date) {
        return new WeightRecordRequest(date, new BigDecimal("72.5"), "En ayunas");
    }

    public static WeightRecordRequest weightRecordRequest(LocalDate date, String weightKg, String comment) {
        return new WeightRecordRequest(date, weightKg == null ? null : new BigDecimal(weightKg), comment);
    }
}
