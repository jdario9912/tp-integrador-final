package com.gestion_deportiva.api.note.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.note.model.enums.NoteType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class NoteTypeConverter extends AbstractCatalogConverter<NoteType> {

    public NoteTypeConverter() {
        super(NoteType.class);
    }
}
