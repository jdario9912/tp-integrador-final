package com.gestion_deportiva.api.note.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo note_types (US-46). Los ids son fijos y coinciden con la V17
public enum NoteType implements CatalogEnum {

    PRIVATE(1, false),
    VISIBLE_TO_ATHLETE(2, true);

    private final short id;
    private final boolean visibleToAthlete;

    NoteType(int id, boolean visibleToAthlete) {
        this.id = (short) id;
        this.visibleToAthlete = visibleToAthlete;
    }

    @Override
    public short getId() {
        return id;
    }

    // Si el atleta puede ver la nota (las privadas nunca salen en sus respuestas)
    public boolean isVisibleToAthlete() {
        return visibleToAthlete;
    }

    public static NoteType fromId(short id) {
        return CatalogEnum.fromId(NoteType.class, id);
    }
}
