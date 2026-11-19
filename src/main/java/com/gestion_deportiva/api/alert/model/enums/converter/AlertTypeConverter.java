package com.gestion_deportiva.api.alert.model.enums.converter;

import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AlertTypeConverter extends AbstractCatalogConverter<AlertType> {

    public AlertTypeConverter() {
        super(AlertType.class);
    }
}
