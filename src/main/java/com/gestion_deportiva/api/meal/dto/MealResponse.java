package com.gestion_deportiva.api.meal.dto;

import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.enums.MealType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Una comida (contrato 11.2). Sin athleteId: las rutas cuelgan de /athletes/{athleteId}. No expone la foto (ola 2)
// totalCaloriesKcal es null si la comida no tiene ítems (una descripción sola no tiene calorías)
// review (US-25) es la revisión del entrenador; null si la comida no está revisada
public record MealResponse(
        UUID id,
        LocalDate date,
        MealType type,
        String description,
        BigDecimal totalCaloriesKcal,
        List<MealItemResponse> items,
        Instant createdAt,
        Instant updatedAt,
        MealReviewResponse review
) {

    public static MealResponse from(Meal meal) {
        return new MealResponse(
                meal.getId(),
                meal.getEatenOn(),
                meal.getType(),
                meal.getDescription(),
                meal.getTotalCaloriesKcal(),
                meal.getItems().stream().map(MealItemResponse::from).toList(),
                meal.getCreatedAt(),
                meal.getUpdatedAt(),
                MealReviewResponse.of(meal));
    }
}
