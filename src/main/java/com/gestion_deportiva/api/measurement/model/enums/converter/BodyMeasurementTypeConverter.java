package com.gestion_deportiva.api.measurement.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BodyMeasurementTypeConverter extends AbstractCatalogConverter<BodyMeasurementType> {

    public BodyMeasurementTypeConverter() {
        super(BodyMeasurementType.class);
    }
}
