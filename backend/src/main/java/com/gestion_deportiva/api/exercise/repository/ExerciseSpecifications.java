package com.gestion_deportiva.api.exercise.repository;

import com.gestion_deportiva.api.exercise.model.Exercise;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

import static com.gestion_deportiva.api.common.specification.TextSearch.containsPattern;
import static com.gestion_deportiva.api.common.specification.TextSearch.isBlank;
import static com.gestion_deportiva.api.common.specification.TextSearch.like;

// Filtros del catálogo de ejercicios (US-38), mismo enfoque que AthleteSpecifications
public final class ExerciseSpecifications {

    private ExerciseSpecifications() {
    }

    // Los globales (sin autor) y los del entrenador; nunca los de otro entrenador
    public static Specification<Exercise> visibleTo(UUID coachId) {
        return (root, query, cb) -> cb.or(
                cb.isNull(root.get("createdBy")),
                cb.equal(root.get("createdBy").get("id"), coachId));
    }

    public static Specification<Exercise> nameContains(String name) {
        if (isBlank(name)) return Specification.unrestricted();
        String pattern = containsPattern(name);
        return (root, query, cb) -> like(cb, root.get("name"), pattern);
    }

    public static Specification<Exercise> muscleGroupIs(MuscleGroup muscleGroup) {
        if (muscleGroup == null) return Specification.unrestricted();
        return (root, query, cb) -> cb.equal(root.get("muscleGroup"), muscleGroup);
    }
}
