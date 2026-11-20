package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// Sin athleteId: los endpoints cuelgan de /athletes/{athleteId} (contrato 17.3)
public record BodyMeasurementRecordResponse(
        UUID id,
        LocalDate date,
        String comment,
        List<BodyMeasurementValueResponse> values,
        Instant createdAt,
        Instant updatedAt
) {

    // Orden estable para el front: el del catálogo (el enum se compara por su orden de declaración) y, dentro de una
    // bilateral, LEFT antes que RIGHT. Sin lado (null) va primero, aunque en una misma medida no conviven
    private static final Comparator<BodyMeasurementValue> DISPLAY_ORDER =
            Comparator.comparing(BodyMeasurementValue::getType)
                    .thenComparing(BodyMeasurementValue::getSide, Comparator.nullsFirst(Comparator.naturalOrder()));

    public static BodyMeasurementRecordResponse from(BodyMeasurementRecord record,
                                                     List<BodyMeasurementValue> measurements) {
        return new BodyMeasurementRecordResponse(
                record.getId(),
                record.getMeasuredOn(),
                record.getComment(),
                measurements.stream()
                        .sorted(DISPLAY_ORDER)
                        .map(BodyMeasurementValueResponse::from)
                        .toList(),
                record.getCreatedAt(),
                record.getUpdatedAt());
    }
}
