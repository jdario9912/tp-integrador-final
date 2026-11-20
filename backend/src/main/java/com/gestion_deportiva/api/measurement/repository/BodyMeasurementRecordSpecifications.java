package com.gestion_deportiva.api.measurement.repository;

import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

// Filtros del listado de registros de medidas (US-45). Specifications y no JPQL con ":from is null": Postgres no
// puede inferir el tipo de un parámetro null (mismo enfoque que WeightRecordSpecifications)
public final class BodyMeasurementRecordSpecifications {

    private BodyMeasurementRecordSpecifications() {
    }

    public static Specification<BodyMeasurementRecord> belongsToAthlete(UUID athleteId) {
        return (root, query, cb) -> cb.equal(root.get("athlete").get("id"), athleteId);
    }

    // Desde, inclusive. null = sin límite inferior
    public static Specification<BodyMeasurementRecord> measuredOnOrAfter(LocalDate from) {
        if (from == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDate>get("measuredOn"), from);
    }

    // Hasta, inclusive. null = sin límite superior
    public static Specification<BodyMeasurementRecord> measuredOnOrBefore(LocalDate to) {
        if (to == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.<LocalDate>get("measuredOn"), to);
    }
}
