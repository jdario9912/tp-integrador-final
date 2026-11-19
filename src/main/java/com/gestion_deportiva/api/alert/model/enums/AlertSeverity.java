package com.gestion_deportiva.api.alert.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo severities (US-47). sortOrder: mayor = más grave. Los ids son fijos y coinciden con la V18
public enum AlertSeverity implements CatalogEnum {

    INFO(1, 1),
    WARNING(2, 2),
    CRITICAL(3, 3);

    private final short id;
    private final int sortOrder;

    AlertSeverity(int id, int sortOrder) {
        this.id = (short) id;
        this.sortOrder = sortOrder;
    }

    @Override
    public short getId() {
        return id;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public static AlertSeverity fromId(short id) {
        return CatalogEnum.fromId(AlertSeverity.class, id);
    }
}
