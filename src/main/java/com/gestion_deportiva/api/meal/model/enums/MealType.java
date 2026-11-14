package com.gestion_deportiva.api.meal.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo meal_types (US-23). Los tipos son fijos: no hay endpoint de catálogo. El orden de las constantes es el
// orden del listado del día (el id del catálogo), así que no cambiarlo
public enum MealType implements CatalogEnum {

    BREAKFAST(1),
    LUNCH(2),
    SNACK(3),
    DINNER(4),
    COLLATION(5),
    PRE_WORKOUT(6),
    POST_WORKOUT(7);

    private final short id;

    MealType(int id) {
        this.id = (short) id;
    }

    @Override
    public short getId() {
        return id;
    }

    public static MealType fromId(short id) {
        return CatalogEnum.fromId(MealType.class, id);
    }
}
