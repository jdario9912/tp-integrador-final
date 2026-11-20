package com.gestion_deportiva.api.measurement.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BodyMeasurementRecordTest {

    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);
    private static final LocalDate NOV_7 = LocalDate.of(2026, 11, 7);
    private static final Athlete LEO = athlete("leo@test.com", coach("ana@test.com"));

    @Test
    void shouldStartWithTheDateTheCommentAndTheSameTimestamps() {
        // Act
        BodyMeasurementRecord record = new BodyMeasurementRecord(LEO, NOV_6, "Después de entrenar", CREATED_AT);

        // Assert
        assertSame(LEO, record.getAthlete());
        assertEquals(NOV_6, record.getMeasuredOn());
        assertEquals("Después de entrenar", record.getComment());
        assertEquals(CREATED_AT, record.getCreatedAt());
        assertEquals(CREATED_AT, record.getUpdatedAt());
    }

    @Test
    void shouldTrimTheCommentAndStoreABlankOneAsNull() {
        assertEquals("En ayunas", record(LEO, NOV_6, "  En ayunas ").getComment());
        assertNull(record(LEO, NOV_6, "   ").getComment());
        assertNull(record(LEO, NOV_6, null).getComment());
    }

    // timestamptz guarda microsegundos: el dominio ya trabaja con esa precisión (la respuesta del alta = el listado)
    @Test
    void shouldTruncateTheTimestampsToMicroseconds() {
        Instant withNanos = Instant.parse("2026-11-01T12:00:00.123456789Z");

        BodyMeasurementRecord record = new BodyMeasurementRecord(LEO, NOV_6, null, withNanos);

        assertEquals(Instant.parse("2026-11-01T12:00:00.123456Z"), record.getCreatedAt());
        assertEquals(record.getCreatedAt(), record.getUpdatedAt());
    }

    @Test
    void shouldRequireTheAthleteAndTheDate() {
        assertThrows(NullPointerException.class, () -> new BodyMeasurementRecord(null, NOV_6, null, CREATED_AT));
        assertThrows(NullPointerException.class, () -> new BodyMeasurementRecord(LEO, null, null, CREATED_AT));
        assertThrows(NullPointerException.class, () -> new BodyMeasurementRecord(LEO, NOV_6, null, null));
    }

    // La corrección cambia fecha y comentario y solo el updatedAt de los timestamps; el alta no se mueve
    @Test
    void shouldCorrectTheDateAndCommentButKeepTheCreationTimestamp() {
        // Arrange
        BodyMeasurementRecord record = record(LEO, NOV_6, "Antes");
        Instant correctedAt = Instant.parse("2026-11-02T09:15:00.000001Z");

        // Act
        record.correct(NOV_7, "  Después  ", correctedAt);

        // Assert
        assertEquals(NOV_7, record.getMeasuredOn());
        assertEquals("Después", record.getComment());
        assertEquals(CREATED_AT, record.getCreatedAt());
        assertEquals(correctedAt, record.getUpdatedAt());
    }

    @Test
    void shouldClearTheCommentWhenTheCorrectionDoesNotSendOne() {
        BodyMeasurementRecord record = record(LEO, NOV_6, "Antes");

        record.correct(NOV_6, null, CREATED_AT);

        assertNull(record.getComment());
    }

    @Test
    void shouldRejectACorrectionWithoutDate() {
        BodyMeasurementRecord record = record(LEO, NOV_6);

        assertThrows(NullPointerException.class, () -> record.correct(null, null, CREATED_AT));
    }

    // equals y hashCode por id: dos registros sin id no son iguales, y con el mismo id sí
    @Test
    void shouldCompareByIdOnly() {
        BodyMeasurementRecord first = record(LEO, NOV_6);
        BodyMeasurementRecord second = record(LEO, NOV_7);
        assertNotEquals(first, second);
        assertFalse(first.equals(null));

        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(first, "id", id);
        ReflectionTestUtils.setField(second, "id", id);
        assertEquals(first, second);
        assertEquals(first.hashCode(), second.hashCode());
        assertTrue(first.equals(first));
    }
}
