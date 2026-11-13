package com.gestion_deportiva.api.training.model.enums;

import com.gestion_deportiva.api.training.model.enums.converter.SessionStatusConverter;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Que el enum coincida con la tabla session_statuses lo controla CatalogSchemaTest (integración)
class SessionStatusTest {

    // El índice parcial de la V10 usa status_id = 1: IN_PROGRESS no puede cambiar de id
    @Test
    void shouldKeepTheIdsOfTheCatalog() {
        assertEquals((short) 1, SessionStatus.IN_PROGRESS.getId());
        assertEquals((short) 2, SessionStatus.FINISHED.getId());
        assertEquals((short) 3, SessionStatus.CANCELLED.getId());
    }

    @Test
    void shouldFindEveryConstantByItsIdAndRejectAnUnknownOne() {
        Arrays.stream(SessionStatus.values())
                .forEach(status -> assertEquals(status, SessionStatus.fromId(status.getId())));
        assertThrows(IllegalArgumentException.class, () -> SessionStatus.fromId((short) 4));
    }

    @Test
    void onlyFinishedAndCancelledAreFinal() {
        assertFalse(SessionStatus.IN_PROGRESS.isFinal());
        assertTrue(SessionStatus.FINISHED.isFinal());
        assertTrue(SessionStatus.CANCELLED.isFinal());
    }

    @Test
    void converterStoresTheIdAndReadsItBack() {
        SessionStatusConverter converter = new SessionStatusConverter();

        assertEquals((short) 1, converter.convertToDatabaseColumn(SessionStatus.IN_PROGRESS));
        assertEquals(SessionStatus.CANCELLED, converter.convertToEntityAttribute((short) 3));
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute((short) 99));
    }
}
