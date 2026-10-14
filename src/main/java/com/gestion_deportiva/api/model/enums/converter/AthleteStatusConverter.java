package com.gestion_deportiva.api.model.enums.converter;

import com.gestion_deportiva.api.model.enums.AthleteStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AthleteStatusConverter extends AbstractCatalogConverter<AthleteStatus> {

    public AthleteStatusConverter() {
        super(AthleteStatus.class);
    }
}
