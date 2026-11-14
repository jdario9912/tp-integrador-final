package com.gestion_deportiva.api.training.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SetStatusConverter extends AbstractCatalogConverter<SetStatus> {

    public SetStatusConverter() {
        super(SetStatus.class);
    }
}
