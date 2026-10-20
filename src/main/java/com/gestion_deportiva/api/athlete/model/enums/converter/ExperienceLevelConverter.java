package com.gestion_deportiva.api.athlete.model.enums.converter;

import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ExperienceLevelConverter extends AbstractCatalogConverter<ExperienceLevel> {

    public ExperienceLevelConverter() {
        super(ExperienceLevel.class);
    }
}
