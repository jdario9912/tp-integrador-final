package com.gestion_deportiva.api.athlete.model.enums.converter;

import com.gestion_deportiva.api.athlete.model.enums.Sex;
import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SexConverter extends AbstractCatalogConverter<Sex> {

    public SexConverter() {
        super(Sex.class);
    }
}
