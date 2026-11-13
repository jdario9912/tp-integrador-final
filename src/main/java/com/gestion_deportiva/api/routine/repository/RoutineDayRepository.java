package com.gestion_deportiva.api.routine.repository;

import com.gestion_deportiva.api.routine.model.RoutineDay;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

// Lectura de los días de una rutina (US-17). Solo lectura: los días se crean, editan y borran a través de Routine
// (cascade), por eso extiende Repository y no JpaRepository
public interface RoutineDayRepository extends Repository<RoutineDay, UUID> {

    // Días de la rutina con sus ejercicios y el ejercicio del catálogo de cada uno, en una sola consulta (sin N+1),
    // ordenados por dayNumber y, dentro de cada día, por sortOrder. left join: un día sin ejercicios viene con la
    // lista vacía. Un solo fetch de colección (d.exercises): dos harían MultipleBagFetchException. Hibernate no
    // repite los días aunque haya una fila por ejercicio
    @Query("""
            select d from RoutineDay d
            left join fetch d.exercises e
            left join fetch e.exercise
            where d.routine.id = :routineId
            order by d.dayNumber, e.sortOrder""")
    List<RoutineDay> findWithExercisesByRoutineId(@Param("routineId") UUID routineId);
}
