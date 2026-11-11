package com.gestion_deportiva.api.food.dto;

import jakarta.validation.constraints.Size;

// Filtro opcional del catálogo (US-39), tomado de los query params. Vacío o en blanco no filtra
public record FoodSearchFilter(

        @Size(max = 100, message = "La búsqueda por nombre no puede superar los 100 caracteres")
        String name
) {
}
