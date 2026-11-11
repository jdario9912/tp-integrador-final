package com.gestion_deportiva.api.food.dto;

import com.gestion_deportiva.api.food.model.Food;

import java.math.BigDecimal;
import java.util.UUID;

public record FoodResponse(
        UUID id,
        String name,
        BigDecimal referencePortionG,
        BigDecimal caloriesKcal,
        BigDecimal proteinG,
        BigDecimal carbsG,
        BigDecimal fatG
) {

    public static FoodResponse from(Food food) {
        return new FoodResponse(
                food.getId(),
                food.getName(),
                food.getReferencePortionG(),
                food.getCaloriesKcal(),
                food.getProteinG(),
                food.getCarbsG(),
                food.getFatG());
    }
}
