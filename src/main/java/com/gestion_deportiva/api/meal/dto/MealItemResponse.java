package com.gestion_deportiva.api.meal.dto;

import com.gestion_deportiva.api.meal.model.MealItem;

import java.math.BigDecimal;
import java.util.UUID;

// Un ítem de la comida (contrato 11.2). El id cambia en cada edición: los ítems se reemplazan completos.
// foodName es la copia del momento de la carga: si el alimento se renombra después, acá no cambia
public record MealItemResponse(
        UUID id,
        UUID foodId,
        String foodName,
        BigDecimal quantityG,
        BigDecimal caloriesKcal,
        BigDecimal proteinG,
        BigDecimal carbsG,
        BigDecimal fatG
) {

    public static MealItemResponse from(MealItem item) {
        return new MealItemResponse(
                item.getId(),
                item.getFoodId(),
                item.getFoodName(),
                item.getQuantityG(),
                item.getCaloriesKcal(),
                item.getProteinG(),
                item.getCarbsG(),
                item.getFatG());
    }
}
