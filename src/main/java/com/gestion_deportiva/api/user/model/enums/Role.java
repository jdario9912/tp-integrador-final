package com.gestion_deportiva.api.user.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo roles
public enum Role implements CatalogEnum {

    COACH(1),
    ATHLETE(2);

    private final short id;

    Role(int id) {
        this.id = (short) id;
    }

    @Override
    public short getId() {
        return id;
    }

    public static Role fromId(short id) {
        return CatalogEnum.fromId(Role.class, id);
    }
}
