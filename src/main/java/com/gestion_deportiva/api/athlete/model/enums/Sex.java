package com.gestion_deportiva.api.athlete.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo sexes
public enum Sex implements CatalogEnum {

    MALE(1),
    FEMALE(2),
    OTHER(3);

    private final short id;

    Sex(int id) {
        this.id = (short) id;
    }

    @Override
    public short getId() {
        return id;
    }

    public static Sex fromId(short id) {
        return CatalogEnum.fromId(Sex.class, id);
    }
}
