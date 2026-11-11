package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.food.dto.FoodRequest;
import com.gestion_deportiva.api.food.model.Food;

import java.math.BigDecimal;

// Datos de prueba reutilizables para el catálogo de alimentos (US-39)
public final class FoodFixtures {

    private FoodFixtures() {
    }

    // Valores de la pechuga de pollo por 100 g
    public static Food food(String name) {
        return Food.builder()
                .name(name)
                .referencePortionG(new BigDecimal("100"))
                .caloriesKcal(new BigDecimal("165"))
                .proteinG(new BigDecimal("31"))
                .carbsG(BigDecimal.ZERO)
                .fatG(new BigDecimal("3.6"))
                .build();
    }

    // Request válido con todos los campos
    public static FoodRequest foodRequest(String name) {
        return new FoodRequest(name, new BigDecimal("100"), new BigDecimal("165"), new BigDecimal("31"),
                BigDecimal.ZERO, new BigDecimal("3.6"));
    }
}
