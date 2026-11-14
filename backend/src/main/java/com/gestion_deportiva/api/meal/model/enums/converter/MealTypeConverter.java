package com.gestion_deportiva.api.meal.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class MealTypeConverter extends AbstractCatalogConverter<MealType> {

    public MealTypeConverter() {
        super(MealType.class);
    }
}
