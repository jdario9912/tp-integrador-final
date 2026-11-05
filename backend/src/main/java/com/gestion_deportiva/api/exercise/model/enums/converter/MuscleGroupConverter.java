package com.gestion_deportiva.api.exercise.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class MuscleGroupConverter extends AbstractCatalogConverter<MuscleGroup> {

    public MuscleGroupConverter() {
        super(MuscleGroup.class);
    }
}
