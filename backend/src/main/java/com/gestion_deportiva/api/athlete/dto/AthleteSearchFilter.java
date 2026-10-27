package com.gestion_deportiva.api.athlete.dto;

import jakarta.validation.constraints.Size;

// Filtros opcionales de "Mis atletas" (US-08), tomados de los query params. Vacíos o en blanco no filtran
public record AthleteSearchFilter(

        // Busca en nombre, apellido o "nombre apellido"
        @Size(max = 100, message = "La búsqueda por nombre no puede superar los 100 caracteres")
        String name,

        @Size(max = 255, message = "La búsqueda por objetivo no puede superar los 255 caracteres")
        String goal
) {
}
