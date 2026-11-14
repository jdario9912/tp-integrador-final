package com.gestion_deportiva.api.meal.dto;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

// Día del listado de comidas (US-23), del query param ?date (YYYY-MM-DD). Opcional: sin él es hoy en la zona de la
// app. Otro formato → 400 con el error en "date" (los errores de binding de un parámetro de consulta van en fieldErrors)
public record MealSearchFilter(

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate date
) {
}
