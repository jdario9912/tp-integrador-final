package com.gestion_deportiva.api.food.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

// Alta y edición de un alimento (US-39, mismo body en POST y PUT). numeric(7,2) en la base: hasta 2 decimales.
// Los valores nutricionales corresponden a la porción de referencia
public record FoodRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String name,

        @NotNull(message = "La porción de referencia es obligatoria")
        @DecimalMin(value = "0", inclusive = false, message = "La porción de referencia debe ser mayor a 0")
        @DecimalMax(value = "10000", message = "La porción de referencia no puede superar 10000")
        @Digits(integer = 5, fraction = 2, message = "La porción de referencia admite hasta 2 decimales")
        BigDecimal referencePortionG,

        @NotNull(message = "Las calorías son obligatorias")
        @DecimalMin(value = "0", message = "Las calorías no pueden ser negativas")
        @DecimalMax(value = "10000", message = "Las calorías no pueden superar 10000")
        @Digits(integer = 5, fraction = 2, message = "Las calorías admiten hasta 2 decimales")
        BigDecimal caloriesKcal,

        @NotNull(message = "Las proteínas son obligatorias")
        @DecimalMin(value = "0", message = "Las proteínas no pueden ser negativas")
        @DecimalMax(value = "10000", message = "Las proteínas no pueden superar 10000")
        @Digits(integer = 5, fraction = 2, message = "Las proteínas admiten hasta 2 decimales")
        BigDecimal proteinG,

        @NotNull(message = "Los carbohidratos son obligatorios")
        @DecimalMin(value = "0", message = "Los carbohidratos no pueden ser negativos")
        @DecimalMax(value = "10000", message = "Los carbohidratos no pueden superar 10000")
        @Digits(integer = 5, fraction = 2, message = "Los carbohidratos admiten hasta 2 decimales")
        BigDecimal carbsG,

        @NotNull(message = "Las grasas son obligatorias")
        @DecimalMin(value = "0", message = "Las grasas no pueden ser negativas")
        @DecimalMax(value = "10000", message = "Las grasas no pueden superar 10000")
        @Digits(integer = 5, fraction = 2, message = "Las grasas admiten hasta 2 decimales")
        BigDecimal fatG
) {
}
