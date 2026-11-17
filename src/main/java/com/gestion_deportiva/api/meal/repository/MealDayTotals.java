package com.gestion_deportiva.api.meal.repository;

import java.math.BigDecimal;

// Fila de la consulta agregada del resumen del día (US-24, contrato 16.6). Los alias de la consulta coinciden con
// estos nombres. Los contadores son Long (bigint de la base) y los totales, BigDecimal (numeric)
public interface MealDayTotals {

    Long getMealCount();

    Long getMealsWithoutNutrition();

    BigDecimal getCaloriesKcal();

    BigDecimal getProteinG();

    BigDecimal getCarbsG();

    BigDecimal getFatG();
}
