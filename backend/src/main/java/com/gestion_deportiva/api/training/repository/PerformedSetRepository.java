package com.gestion_deportiva.api.training.repository;

import com.gestion_deportiva.api.training.model.PerformedSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PerformedSetRepository extends JpaRepository<PerformedSet, UUID> {

    // Si alguno de esos ejercicios tiene series registradas (ix_performed_sets_routine_exercise): lo usa el checker
    // de la rutina antes de quitar un ejercicio
    boolean existsByRoutineExerciseIdIn(Collection<UUID> routineExerciseIds);

    // La serie de esa clave, si ya se registró: el PUT la reemplaza en vez de duplicarla
    Optional<PerformedSet> findByTrainingSessionIdAndRoutineExerciseIdAndSetNumber(UUID trainingSessionId,
                                                                                   UUID routineExerciseId,
                                                                                   short setNumber);

    // Las series registradas de la sesión, en el orden del día (sortOrder del ejercicio) y por número de serie.
    // Consulta aparte de la del detalle: el día ya trae su lista de ejercicios y dos colecciones en un fetch darían
    // MultipleBagFetchException
    @Query("""
            select p from PerformedSet p
            join fetch p.routineExercise re
            where p.trainingSession.id = :sessionId
            order by re.sortOrder, p.setNumber""")
    List<PerformedSet> findBySessionInOrder(@Param("sessionId") UUID sessionId);
}
