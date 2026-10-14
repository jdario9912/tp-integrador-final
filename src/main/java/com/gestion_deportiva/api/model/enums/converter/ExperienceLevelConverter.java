package com.gestion_deportiva.api.model.enums.converter;

import com.gestion_deportiva.api.model.enums.ExperienceLevel;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ExperienceLevelConverter extends AbstractCatalogConverter<ExperienceLevel> {

    public ExperienceLevelConverter() {
        super(ExperienceLevel.class);
    }
}
