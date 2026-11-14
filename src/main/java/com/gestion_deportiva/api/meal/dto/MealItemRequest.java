package com.gestion_deportiva.api.meal.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

// Un alimento de la comida con su cantidad en gramos (US-23, contrato 11.3). Que el alimento exista en el catálogo
// lo verifica MealService (404), no el request
public record MealItemRequest(

        @NotNull(message = "El alimento es obligatorio")
        UUID foodId,

        // numeric(7,2) en la base: hasta 5 enteros y 2 decimales (máximo 99999.99), mayor a 0
        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0", inclusive = false, message = "La cantidad debe ser mayor a 0 g")
        @Digits(integer = 5, fraction = 2, message = "La cantidad admite hasta 5 enteros y 2 decimales")
        BigDecimal quantityG
) {
}
