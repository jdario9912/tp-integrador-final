package com.gestion_deportiva.api.meal.dto;

import com.gestion_deportiva.api.meal.model.Meal;

import java.time.Instant;

// US-25 · Revisión del entrenador sobre una comida: cuándo la revisó y su comentario. Va en la comida (campo review).
// Sin revisión, el campo es null y no un objeto vacío
public record MealReviewResponse(
        // Último momento de revisión (AppClock, a microsegundos)
        Instant reviewedAt,
        // Comentario recortado; null si el entrenador no escribió texto
        String observation
) {

    // null si la comida no está revisada
    public static MealReviewResponse of(Meal meal) {
        if (!meal.isReviewed()) {
            return null;
        }
        return new MealReviewResponse(meal.getReviewedAt(), meal.getCoachObservation());
    }
}
