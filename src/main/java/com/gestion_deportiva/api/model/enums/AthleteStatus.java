package com.gestion_deportiva.api.model.enums;

// Catálogo athlete_statuses
public enum AthleteStatus implements CatalogEnum {

    ACTIVE(1, false),
    NEEDS_REVIEW(2, true),
    NO_ROUTINE(3, true),
    NO_ACTIVITY(4, true),
    INACTIVE(5, false);

    private final short id;
    private final boolean requiresAttention;

    AthleteStatus(int id, boolean requiresAttention) {
        this.id = (short) id;
        this.requiresAttention = requiresAttention;
    }

    @Override
    public short getId() {
        return id;
    }

    // Si el entrenador debería mirar a este atleta (dashboard y alertas)
    public boolean requiresAttention() {
        return requiresAttention;
    }

    public static AthleteStatus fromId(short id) {
        return CatalogEnum.fromId(AthleteStatus.class, id);
    }
}
