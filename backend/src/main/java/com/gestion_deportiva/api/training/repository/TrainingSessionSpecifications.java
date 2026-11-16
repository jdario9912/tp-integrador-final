package com.gestion_deportiva.api.training.repository;

import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

// Filtros del historial de sesiones (US-21, contrato 15.2). Specifications y no JPQL con ":from is null": Postgres no
// puede inferir el tipo de un parámetro null (mismo enfoque que WeightRecordSpecifications)
public final class TrainingSessionSpecifications {

    private TrainingSessionSpecifications() {
    }

    public static Specification<TrainingSession> belongsToAthlete(UUID athleteId) {
        return (root, query, cb) -> cb.equal(root.get("athlete").get("id"), athleteId);
    }

    // Solo las cerradas: FINISHED y CANCELLED. La sesión en progreso no entra en el historial
    public static Specification<TrainingSession> closed() {
        return (root, query, cb) -> root.<SessionStatus>get("status")
                .in(SessionStatus.FINISHED, SessionStatus.CANCELLED);
    }

    // Desde, inclusive. null = sin límite inferior
    public static Specification<TrainingSession> sessionDateOnOrAfter(LocalDate from) {
        if (from == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDate>get("sessionDate"), from);
    }

    // Hasta, inclusive. null = sin límite superior
    public static Specification<TrainingSession> sessionDateOnOrBefore(LocalDate to) {
        if (to == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.<LocalDate>get("sessionDate"), to);
    }
}
