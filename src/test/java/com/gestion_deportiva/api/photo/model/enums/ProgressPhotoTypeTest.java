package com.gestion_deportiva.api.photo.model.enums;

import com.gestion_deportiva.api.photo.model.enums.converter.ProgressPhotoTypeConverter;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Que el enum coincida con la tabla photo_types lo controla CatalogSchemaTest (integración)
class ProgressPhotoTypeTest {

    // Los ids son fijos: lo que se guarda en progress_photos.type_id
    @Test
    void shouldKeepTheIdsOfTheCatalog() {
        assertEquals((short) 1, ProgressPhotoType.FRONT.getId());
        assertEquals((short) 2, ProgressPhotoType.SIDE.getId());
        assertEquals((short) 3, ProgressPhotoType.BACK.getId());
    }

    @Test
    void shouldFindEveryConstantByItsIdAndRejectAnUnknownOne() {
        Arrays.stream(ProgressPhotoType.values())
                .forEach(type -> assertEquals(type, ProgressPhotoType.fromId(type.getId())));
        assertThrows(IllegalArgumentException.class, () -> ProgressPhotoType.fromId((short) 4));
    }

    @Test
    void converterStoresTheIdAndReadsItBack() {
        ProgressPhotoTypeConverter converter = new ProgressPhotoTypeConverter();

        assertEquals((short) 2, converter.convertToDatabaseColumn(ProgressPhotoType.SIDE));
        assertEquals(ProgressPhotoType.BACK, converter.convertToEntityAttribute((short) 3));
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute((short) 99));
    }
}
