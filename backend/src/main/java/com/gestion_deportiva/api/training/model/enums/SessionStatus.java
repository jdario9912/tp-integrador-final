package com.gestion_deportiva.api.training.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo session_statuses (US-18). Toda sesión nace IN_PROGRESS; FINISHED y CANCELLED los usa US-20.
// IN_PROGRESS tiene que ser siempre el 1: lo usa el índice parcial ux_training_sessions_athlete_in_progress (V10)
public enum SessionStatus implements CatalogEnum {

    IN_PROGRESS(1, false),
    FINISHED(2, true),
    CANCELLED(3, true);

    private final short id;
    private final boolean finalStatus;

    SessionStatus(int id, boolean finalStatus) {
        this.id = (short) id;
        this.finalStatus = finalStatus;
    }

    @Override
    public short getId() {
        return id;
    }

    // Un estado final ya no cambia (columna is_final)
    public boolean isFinal() {
        return finalStatus;
    }

    public static SessionStatus fromId(short id) {
        return CatalogEnum.fromId(SessionStatus.class, id);
    }
}
