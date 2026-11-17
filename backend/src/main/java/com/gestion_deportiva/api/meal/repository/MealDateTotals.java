package com.gestion_deportiva.api.meal.repository;

import java.time.LocalDate;

// US-25 · Fila de la consulta agregada por día de un rango: los totales del resumen de US-24 más el día. Solo hay
// filas para los días con comidas
public interface MealDateTotals extends MealDayTotals {

    LocalDate getDate();
}
