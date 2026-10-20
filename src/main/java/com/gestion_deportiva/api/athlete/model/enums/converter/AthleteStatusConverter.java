package com.gestion_deportiva.api.athlete.model.enums.converter;

import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AthleteStatusConverter extends AbstractCatalogConverter<AthleteStatus> {

    public AthleteStatusConverter() {
        super(AthleteStatus.class);
    }
}
