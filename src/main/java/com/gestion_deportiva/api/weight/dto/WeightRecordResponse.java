package com.gestion_deportiva.api.weight.dto;

import com.gestion_deportiva.api.weight.model.WeightRecord;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// Sin athleteId: los tres endpoints cuelgan de /athletes/{athleteId} (contrato 8.2)
public record WeightRecordResponse(
        UUID id,
        LocalDate date,
        BigDecimal weightKg,
        String comment,
        Instant createdAt,
        Instant updatedAt
) {

    public static WeightRecordResponse from(WeightRecord weightRecord) {
        return new WeightRecordResponse(
                weightRecord.getId(),
                weightRecord.getRecordedOn(),
                weightRecord.getWeightKg(),
                weightRecord.getComment(),
                weightRecord.getCreatedAt(),
                weightRecord.getUpdatedAt());
    }
}
