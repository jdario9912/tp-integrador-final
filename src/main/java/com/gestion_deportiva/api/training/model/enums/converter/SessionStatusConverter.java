package com.gestion_deportiva.api.training.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SessionStatusConverter extends AbstractCatalogConverter<SessionStatus> {

    public SessionStatusConverter() {
        super(SessionStatus.class);
    }
}
