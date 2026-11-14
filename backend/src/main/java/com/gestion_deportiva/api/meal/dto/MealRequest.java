package com.gestion_deportiva.api.meal.dto;

import com.gestion_deportiva.api.meal.model.enums.MealType;
import com.gestion_deportiva.api.meal.validation.ValidMealContent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

// Alta y edición de una comida (US-23, mismo body en POST y PUT; contrato 11.3). Sin athleteId ni id: salen de la ruta.
// Que la fecha no sea futura lo valida MealServiceImpl con el reloj y la zona de la app (AppClock), no acá.
// La regla "descripción o al menos un alimento" la valida @ValidMealContent (400 con el error en "items")
@ValidMealContent
public record MealRequest(

        @NotNull(message = "La fecha es obligatoria")
        LocalDate date,

        // Un código que no existe en el catálogo no llega acá: Jackson lo rechaza como JSON mal formado
        @NotNull(message = "El tipo de comida es obligatorio")
        MealType type,

        // Se cuenta lo que llega, antes de recortar los espacios; vacío o solo espacios se guarda null
        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String description,

        // Si falta o es null se toma como lista vacía. Hasta 50 ítems; cada uno, con su alimento y su cantidad
        @Size(max = 50, message = "Una comida admite hasta 50 alimentos")
        List<@Valid MealItemRequest> items
) {

    // Un null dentro de la lista no es un error de campo: es JSON mal formado (400 sin fieldErrors)
    public MealRequest {
        items = items == null ? List.of() : items;
        if (items.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Cada alimento de la comida es obligatorio");
        }
    }
}
