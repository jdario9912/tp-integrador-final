package com.gestion_deportiva.api.weight.repository;

import com.gestion_deportiva.api.weight.model.WeightRecord;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

// Filtros del listado de registros de peso (US-26). Specifications y no JPQL con ":from is null": Postgres no
// puede inferir el tipo de un parámetro null (mismo enfoque que AthleteSpecifications)
public final class WeightRecordSpecifications {

    private WeightRecordSpecifications() {
    }

    public static Specification<WeightRecord> belongsToAthlete(UUID athleteId) {
        return (root, query, cb) -> cb.equal(root.get("athlete").get("id"), athleteId);
    }

    // Desde, inclusive. null = sin límite inferior
    public static Specification<WeightRecord> recordedOnOrAfter(LocalDate from) {
        if (from == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDate>get("recordedOn"), from);
    }

    // Hasta, inclusive. null = sin límite superior
    public static Specification<WeightRecord> recordedOnOrBefore(LocalDate to) {
        if (to == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.<LocalDate>get("recordedOn"), to);
    }
}
