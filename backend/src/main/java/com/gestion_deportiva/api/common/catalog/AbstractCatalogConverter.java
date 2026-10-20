package com.gestion_deportiva.api.common.catalog;

import jakarta.persistence.AttributeConverter;

// Convierte un enum catálogo a su id (columna smallint con FK) y viceversa.
// Cada enum tiene su subclase con @Converter(autoApply = true): Hibernate la aplica sola.
public abstract class AbstractCatalogConverter<E extends Enum<E> & CatalogEnum>
        implements AttributeConverter<E, Short> {

    private final Class<E> type;

    protected AbstractCatalogConverter(Class<E> type) {
        this.type = type;
    }

    @Override
    public Short convertToDatabaseColumn(E value) {
        return value == null ? null : value.getId();
    }

    @Override
    public E convertToEntityAttribute(Short id) {
        return id == null ? null : CatalogEnum.fromId(type, id);
    }
}
