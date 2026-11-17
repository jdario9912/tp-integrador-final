package com.gestion_deportiva.api.meal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Resumen nutricional de un día (US-24, contrato 16.2). Los totales suman los valores ya redondeados de cada ítem
// (2 decimales) y no incluyen las comidas sin ítems: esas cuentan en mealCount y en mealsWithoutNutrition.
// Un día sin comidas responde todo en cero, no 404
public record DailyNutritionSummary(
        LocalDate date,
        BigDecimal caloriesKcal,
        BigDecimal proteinG,
        BigDecimal carbsG,
        BigDecimal fatG,
        long mealCount,
        long mealsWithoutNutrition
) {
}
