package com.gestion_deportiva.api.model.enums.converter;

import com.gestion_deportiva.api.model.enums.Sex;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SexConverter extends AbstractCatalogConverter<Sex> {

    public SexConverter() {
        super(Sex.class);
    }
}
