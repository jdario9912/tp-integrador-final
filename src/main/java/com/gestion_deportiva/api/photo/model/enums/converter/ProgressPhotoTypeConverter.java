package com.gestion_deportiva.api.photo.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ProgressPhotoTypeConverter extends AbstractCatalogConverter<ProgressPhotoType> {

    public ProgressPhotoTypeConverter() {
        super(ProgressPhotoType.class);
    }
}
