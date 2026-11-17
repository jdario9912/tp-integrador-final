package com.gestion_deportiva.api.meal.dto;

import com.gestion_deportiva.api.common.validation.DateRange;
import com.gestion_deportiva.api.common.validation.ValidDateRange;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

// US-25 · Rango de la vista de alimentación, de los query params ?from y ?to (YYYY-MM-DD, inclusivos sobre la fecha
// de la comida). Los dos opcionales: sin ninguno, los últimos 7 días hasta hoy; con uno solo, la semana que empieza o
// termina en él (lo resuelve MealServiceImpl). from posterior a to → 400 con el error en "from"; otro formato → 400
// en ese campo; más de 31 días → 400 en "to" (MealRangeTooLongException)
@ValidDateRange
public record MealOverviewFilter(

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate from,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate to
) implements DateRange {
}
