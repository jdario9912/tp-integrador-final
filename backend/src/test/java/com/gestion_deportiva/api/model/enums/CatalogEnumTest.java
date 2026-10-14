package com.gestion_deportiva.api.model.enums;

import com.gestion_deportiva.api.model.enums.converter.AthleteStatusConverter;
import com.gestion_deportiva.api.model.enums.converter.ExperienceLevelConverter;
import com.gestion_deportiva.api.model.enums.converter.RoleConverter;
import com.gestion_deportiva.api.model.enums.converter.SexConverter;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CatalogEnumTest {

    private static final List<CatalogEnum[]> CATALOGS = List.of(
            Role.values(), Sex.values(), ExperienceLevel.values(), AthleteStatus.values());

    @Test
    void everyConstantIsFoundByItsId() {
        for (Role value : Role.values()) assertEquals(value, Role.fromId(value.getId()));
        for (Sex value : Sex.values()) assertEquals(value, Sex.fromId(value.getId()));
        for (ExperienceLevel value : ExperienceLevel.values()) assertEquals(value, ExperienceLevel.fromId(value.getId()));
        for (AthleteStatus value : AthleteStatus.values()) assertEquals(value, AthleteStatus.fromId(value.getId()));
    }

    @Test
    void idsAreUniqueWithinEachCatalog() {
        for (CatalogEnum[] catalog : CATALOGS) {
            long distinctIds = Arrays.stream(catalog).map(CatalogEnum::getId).distinct().count();
            assertEquals(catalog.length, distinctIds, "ids repetidos en " + catalog[0].getClass().getSimpleName());
        }
    }

    @Test
    void unknownIdIsRejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> Sex.fromId((short) 99));
        assertEquals("Valor inexistente para Sex: 99", ex.getMessage());
        assertThrows(IllegalArgumentException.class, () -> Role.fromId((short) 0));
        assertThrows(IllegalArgumentException.class, () -> ExperienceLevel.fromId((short) -1));
        assertThrows(IllegalArgumentException.class, () -> AthleteStatus.fromId((short) 6));
    }

    @Test
    void onlyAlertStatusesRequireAttention() {
        assertFalse(AthleteStatus.ACTIVE.requiresAttention());
        assertTrue(AthleteStatus.NEEDS_REVIEW.requiresAttention());
        assertTrue(AthleteStatus.NO_ROUTINE.requiresAttention());
        assertTrue(AthleteStatus.NO_ACTIVITY.requiresAttention());
        assertFalse(AthleteStatus.INACTIVE.requiresAttention());
    }

    @Test
    void convertersStoreTheIdAndReadItBack() {
        RoleConverter role = new RoleConverter();
        assertEquals((short) 1, role.convertToDatabaseColumn(Role.COACH));
        assertEquals(Role.ATHLETE, role.convertToEntityAttribute((short) 2));

        SexConverter sex = new SexConverter();
        assertEquals((short) 2, sex.convertToDatabaseColumn(Sex.FEMALE));
        assertEquals(Sex.OTHER, sex.convertToEntityAttribute((short) 3));

        ExperienceLevelConverter level = new ExperienceLevelConverter();
        assertEquals((short) 3, level.convertToDatabaseColumn(ExperienceLevel.ADVANCED));
        assertEquals(ExperienceLevel.BEGINNER, level.convertToEntityAttribute((short) 1));

        AthleteStatusConverter status = new AthleteStatusConverter();
        assertEquals((short) 4, status.convertToDatabaseColumn(AthleteStatus.NO_ACTIVITY));
        assertEquals(AthleteStatus.INACTIVE, status.convertToEntityAttribute((short) 5));
    }

    @Test
    void convertersKeepNulls() {
        assertNull(new RoleConverter().convertToDatabaseColumn(null));
        assertNull(new SexConverter().convertToEntityAttribute(null));
        assertNull(new ExperienceLevelConverter().convertToDatabaseColumn(null));
        assertNull(new AthleteStatusConverter().convertToEntityAttribute(null));
    }

    @Test
    void converterRejectsUnknownIdFromDatabase() {
        assertThrows(IllegalArgumentException.class, () -> new SexConverter().convertToEntityAttribute((short) 99));
    }
}
