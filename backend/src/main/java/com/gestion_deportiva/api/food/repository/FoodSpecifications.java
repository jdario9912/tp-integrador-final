package com.gestion_deportiva.api.food.repository;

import com.gestion_deportiva.api.food.model.Food;
import org.springframework.data.jpa.domain.Specification;

import static com.gestion_deportiva.api.common.specification.TextSearch.containsPattern;
import static com.gestion_deportiva.api.common.specification.TextSearch.isBlank;
import static com.gestion_deportiva.api.common.specification.TextSearch.like;

// Filtros del catálogo de alimentos (US-39), mismo enfoque que ExerciseSpecifications
public final class FoodSpecifications {

    private FoodSpecifications() {
    }

    public static Specification<Food> nameContains(String name) {
        if (isBlank(name)) return Specification.unrestricted();
        String pattern = containsPattern(name);
        return (root, query, cb) -> like(cb, root.get("name"), pattern);
    }
}
