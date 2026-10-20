package com.gestion_deportiva.api.athlete.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo experience_levels
public enum ExperienceLevel implements CatalogEnum {

    BEGINNER(1),
    INTERMEDIATE(2),
    ADVANCED(3);

    private final short id;

    ExperienceLevel(int id) {
        this.id = (short) id;
    }

    @Override
    public short getId() {
        return id;
    }

    public static ExperienceLevel fromId(short id) {
        return CatalogEnum.fromId(ExperienceLevel.class, id);
    }
}
