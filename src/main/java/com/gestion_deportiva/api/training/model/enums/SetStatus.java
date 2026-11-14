package com.gestion_deportiva.api.training.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo set_statuses (US-19): una serie prescrita se realizó (DONE) o se omitió con un motivo (SKIPPED).
// Lo que no tiene registro está pendiente y no es un estado. Los ids coinciden con la V11
public enum SetStatus implements CatalogEnum {

    DONE(1),
    SKIPPED(2);

    private final short id;

    SetStatus(int id) {
        this.id = (short) id;
    }

    @Override
    public short getId() {
        return id;
    }

    public static SetStatus fromId(short id) {
        return CatalogEnum.fromId(SetStatus.class, id);
    }
}
