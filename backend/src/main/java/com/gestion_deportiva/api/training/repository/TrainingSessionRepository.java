package com.gestion_deportiva.api.training.repository;

import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, UUID> {

    // Con IN_PROGRESS usa el índice parcial ux_training_sessions_athlete_in_progress
    boolean existsByAthleteIdAndStatus(UUID athleteId, SessionStatus status);

    // Si alguno de esos días tiene sesiones, en cualquier estado (ix_training_sessions_routine_day)
    boolean existsByRoutineDayIdIn(Collection<UUID> routineDayIds);

    // Sesión de ese atleta con todo lo que lee la respuesta en una sola consulta (sin N+1): la asignación con su
    // rutina y el día con sus ejercicios y el ejercicio del catálogo de cada uno, por sortOrder. Un solo fetch de
    // colección (d.exercises); left join: un día sin ejercicios viene con la lista vacía. Hibernate no repite la
    // sesión aunque haya una fila por ejercicio. Vacío si no existe o es de otro atleta
    @Query("""
            select s from TrainingSession s
            join fetch s.assignment a
            join fetch a.routine
            join fetch s.routineDay d
            left join fetch d.exercises e
            left join fetch e.exercise
            where s.id = :sessionId and s.athlete.id = :athleteId
            order by e.sortOrder""")
    Optional<TrainingSession> findDetail(@Param("athleteId") UUID athleteId, @Param("sessionId") UUID sessionId);

    // Igual que findDetail, buscando por estado. Con IN_PROGRESS hay a lo sumo una (índice parcial)
    @Query("""
            select s from TrainingSession s
            join fetch s.assignment a
            join fetch a.routine
            join fetch s.routineDay d
            left join fetch d.exercises e
            left join fetch e.exercise
            where s.athlete.id = :athleteId and s.status = :status
            order by e.sortOrder""")
    Optional<TrainingSession> findDetailByAthleteIdAndStatus(@Param("athleteId") UUID athleteId,
                                                             @Param("status") SessionStatus status);
}
