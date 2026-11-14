package com.gestion_deportiva.api.training.model.enums;

import com.gestion_deportiva.api.training.model.enums.converter.SetStatusConverter;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Que el enum coincida con la tabla set_statuses lo controla CatalogSchemaTest (integración)
class SetStatusTest {

    // Los ids son los de la V11: si cambian, las filas guardadas apuntan a otro estado
    @Test
    void shouldKeepTheIdsOfTheCatalog() {
        assertEquals((short) 1, SetStatus.DONE.getId());
        assertEquals((short) 2, SetStatus.SKIPPED.getId());
    }

    @Test
    void shouldFindEveryConstantByItsIdAndRejectAnUnknownOne() {
        Arrays.stream(SetStatus.values())
                .forEach(status -> assertEquals(status, SetStatus.fromId(status.getId())));
        assertThrows(IllegalArgumentException.class, () -> SetStatus.fromId((short) 3));
    }

    @Test
    void converterStoresTheIdAndReadsItBack() {
        SetStatusConverter converter = new SetStatusConverter();

        assertEquals((short) 2, converter.convertToDatabaseColumn(SetStatus.SKIPPED));
        assertEquals(SetStatus.DONE, converter.convertToEntityAttribute((short) 1));
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute((short) 9));
    }
}
