package com.gestion_deportiva.api.photo.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo photo_types (US-28): ángulo de la foto de progreso. Los ids son fijos y coinciden con la V12
public enum ProgressPhotoType implements CatalogEnum {

    FRONT(1),
    SIDE(2),
    BACK(3);

    private final short id;

    ProgressPhotoType(int id) {
        this.id = (short) id;
    }

    @Override
    public short getId() {
        return id;
    }

    public static ProgressPhotoType fromId(short id) {
        return CatalogEnum.fromId(ProgressPhotoType.class, id);
    }
}
