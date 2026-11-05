package com.gestion_deportiva.api.exercise.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

import static com.gestion_deportiva.api.exercise.model.enums.MuscleRegion.CORE;
import static com.gestion_deportiva.api.exercise.model.enums.MuscleRegion.FULL;
import static com.gestion_deportiva.api.exercise.model.enums.MuscleRegion.LOWER;
import static com.gestion_deportiva.api.exercise.model.enums.MuscleRegion.UPPER;

// Catálogo muscle_groups (US-38). El nombre y la región también están en la tabla: CatalogSchemaTest los compara
public enum MuscleGroup implements CatalogEnum {

    CHEST(1, "Pecho", UPPER),
    BACK(2, "Espalda", UPPER),
    SHOULDERS(3, "Hombros", UPPER),
    BICEPS(4, "Bíceps", UPPER),
    TRICEPS(5, "Tríceps", UPPER),
    FOREARMS(6, "Antebrazos", UPPER),
    ABS(7, "Abdominales", CORE),
    QUADRICEPS(8, "Cuádriceps", LOWER),
    HAMSTRINGS(9, "Isquiotibiales", LOWER),
    GLUTES(10, "Glúteos", LOWER),
    CALVES(11, "Gemelos", LOWER),
    FULL_BODY(12, "Cuerpo completo", FULL);

    private final short id;
    private final String displayName;
    private final MuscleRegion region;

    MuscleGroup(int id, String displayName, MuscleRegion region) {
        this.id = (short) id;
        this.displayName = displayName;
        this.region = region;
    }

    @Override
    public short getId() {
        return id;
    }

    // Nombre en castellano para mostrar en el front
    public String getDisplayName() {
        return displayName;
    }

    public MuscleRegion getRegion() {
        return region;
    }

    public static MuscleGroup fromId(short id) {
        return CatalogEnum.fromId(MuscleGroup.class, id);
    }
}
