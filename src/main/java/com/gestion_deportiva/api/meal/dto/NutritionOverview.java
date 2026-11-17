package com.gestion_deportiva.api.meal.dto;

import java.time.LocalDate;
import java.util.List;

// US-25 · Alimentación de un atleta en un rango de días: el resumen de cada día (el mismo de US-24, también los días
// sin comidas, en cero) y la constancia de registro. No hay un plan nutricional objetivo: la adherencia se mide como
// días con al menos una comida cargada
public record NutritionOverview(
        LocalDate from,
        LocalDate to,
        // Días del rango, inclusivo (de 1 a 31)
        int totalDays,
        // Días con al menos una comida (constancia de registro)
        int daysWithMeals,
        // Un resumen por día, de from a to, en orden
        List<DailyNutritionSummary> days
) {
}
