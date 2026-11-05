package com.gestion_deportiva.api.exercise.repository;

import com.gestion_deportiva.api.exercise.model.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

// JpaSpecificationExecutor: catálogo paginado con filtros opcionales (US-38, ver ExerciseSpecifications)
public interface ExerciseRepository extends JpaRepository<Exercise, UUID>, JpaSpecificationExecutor<Exercise> {

    // Nombre repetido en el catálogo del entrenador (los eliminados no cuentan, @SQLRestriction de Exercise)
    boolean existsByCreatedByIdAndNameIgnoreCase(UUID coachId, String name);
}
