package com.gestion_deportiva.api.meal.model.enums;

import com.gestion_deportiva.api.meal.model.enums.converter.MealTypeConverter;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Que el enum coincida con la tabla meal_types lo controla CatalogSchemaTest (integración)
class MealTypeTest {

    // El listado del día se ordena por este id (contrato 11.7): el orden de las constantes no puede cambiar
    @Test
    void shouldKeepTheIdsOfTheCatalogInTheListingOrder() {
        assertEquals(
                Arrays.asList("BREAKFAST", "LUNCH", "SNACK", "DINNER", "COLLATION", "PRE_WORKOUT", "POST_WORKOUT"),
                Arrays.stream(MealType.values()).map(Enum::name).toList());
        for (int i = 0; i < MealType.values().length; i++) {
            assertEquals((short) (i + 1), MealType.values()[i].getId());
        }
    }

    @Test
    void shouldFindEveryConstantByItsIdAndRejectAnUnknownOne() {
        Arrays.stream(MealType.values())
                .forEach(type -> assertEquals(type, MealType.fromId(type.getId())));
        assertThrows(IllegalArgumentException.class, () -> MealType.fromId((short) 8));
    }

    @Test
    void converterStoresTheIdAndReadsItBack() {
        MealTypeConverter converter = new MealTypeConverter();

        assertEquals((short) 2, converter.convertToDatabaseColumn(MealType.LUNCH));
        assertEquals(MealType.POST_WORKOUT, converter.convertToEntityAttribute((short) 7));
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute((short) 99));
    }
}
