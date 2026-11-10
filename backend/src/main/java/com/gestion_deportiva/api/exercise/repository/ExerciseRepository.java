package com.gestion_deportiva.api.exercise.repository;

import com.gestion_deportiva.api.exercise.model.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

// JpaSpecificationExecutor: catálogo paginado con filtros opcionales (US-38, ver ExerciseSpecifications)
public interface ExerciseRepository extends JpaRepository<Exercise, UUID>, JpaSpecificationExecutor<Exercise> {

    // Nombre repetido en el catálogo del entrenador (los eliminados no cuentan, @SQLRestriction de Exercise)
    boolean existsByCreatedByIdAndNameIgnoreCase(UUID coachId, String name);

    // Los que el entrenador puede usar en sus rutinas (US-14): globales o propios, no eliminados
    @Query("select e from Exercise e where e.id in :ids and (e.createdBy is null or e.createdBy.id = :coachId)")
    List<Exercise> findVisibleByIdIn(@Param("coachId") UUID coachId, @Param("ids") Collection<UUID> ids);

    // Planificado en alguna rutina (US-14). Nativa para no depender de las entidades del módulo routine
    @Query(value = "select exists (select 1 from routine_exercises where exercise_id = :exerciseId)",
            nativeQuery = true)
    boolean isUsedInRoutines(@Param("exerciseId") UUID exerciseId);
}
