package com.gestion_deportiva.api.common.catalog;

import java.util.Arrays;

// Enum que representa una fila de una tabla catálogo. El id de cada constante
// debe coincidir con el id de su fila en la migración (es lo que se guarda en la FK).
public interface CatalogEnum {

    short getId();

    static <E extends Enum<E> & CatalogEnum> E fromId(Class<E> type, short id) {
        return Arrays.stream(type.getEnumConstants())
                .filter(constant -> constant.getId() == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Valor inexistente para " + type.getSimpleName() + ": " + id));
    }
}
