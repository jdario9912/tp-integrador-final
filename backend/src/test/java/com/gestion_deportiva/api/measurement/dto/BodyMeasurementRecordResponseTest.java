package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.measurement;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BodyMeasurementRecordResponseTest {

    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);

    // Las medidas salen en el orden del catálogo y, dentro de una bilateral, LEFT antes que RIGHT (contrato 17.3.1),
    // aunque lleguen desordenadas
    @Test
    void shouldListTheValuesInCatalogOrderAndLeftBeforeRight() {
        // Arrange
        BodyMeasurementRecord record = record(athlete("leo@test.com", coach("ana@test.com")), NOV_6, "Hoy");
        ReflectionTestUtils.setField(record, "id", UUID.randomUUID());
        List<BodyMeasurementValue> unordered = List.of(
                measurement(record, BodyMeasurementType.BODY_FAT, null, "18"),
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35.25"),
                measurement(record, BodyMeasurementType.WAIST, null, "84.5"),
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT, "34.8"));

        // Act
        BodyMeasurementRecordResponse response = BodyMeasurementRecordResponse.from(record, unordered);

        // Assert
        assertEquals(record.getId(), response.id());
        assertEquals(NOV_6, response.date());
        assertEquals("Hoy", response.comment());
        assertEquals(CREATED_AT, response.createdAt());
        assertEquals(CREATED_AT, response.updatedAt());
        assertEquals(List.of(
                        new BodyMeasurementValueResponse(BodyMeasurementType.WAIST, null, unordered.get(2).getValue()),
                        new BodyMeasurementValueResponse(BodyMeasurementType.ARM, MeasurementSide.LEFT,
                                unordered.get(3).getValue()),
                        new BodyMeasurementValueResponse(BodyMeasurementType.ARM, MeasurementSide.RIGHT,
                                unordered.get(1).getValue()),
                        new BodyMeasurementValueResponse(BodyMeasurementType.BODY_FAT, null,
                                unordered.get(0).getValue())),
                response.values());
    }

    @Test
    void shouldMapAnEmptyCommentAsNull() {
        BodyMeasurementRecord record = record(athlete("leo@test.com", coach("ana@test.com")), NOV_6);

        BodyMeasurementRecordResponse response = BodyMeasurementRecordResponse.from(record, List.of());

        assertNull(response.comment());
        assertEquals(List.of(), response.values());
    }
}
