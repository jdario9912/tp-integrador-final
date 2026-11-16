package com.gestion_deportiva.api.training.repository;

import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.training.repository.TrainingSessionSpecifications.belongsToAthlete;
import static com.gestion_deportiva.api.training.repository.TrainingSessionSpecifications.closed;
import static com.gestion_deportiva.api.training.repository.TrainingSessionSpecifications.sessionDateOnOrAfter;
import static com.gestion_deportiva.api.training.repository.TrainingSessionSpecifications.sessionDateOnOrBefore;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, UUID>,
        JpaSpecificationExecutor<TrainingSession> {

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

    // Bloqueo de la fila de la sesión para registrar una serie (US-19, contrato 11.5). Consulta sin joins: Postgres no
    // admite FOR UPDATE sobre el lado nulo de un left join. Dos registros seguidos se ejecutan uno tras otro, y una
    // finalización concurrente (US-20) espera. Vacío si no existe o es de otro atleta
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TrainingSession s where s.id = :sessionId and s.athlete.id = :athleteId")
    Optional<TrainingSession> findByIdAndAthleteIdForUpdate(@Param("sessionId") UUID sessionId,
                                                            @Param("athleteId") UUID athleteId);

    // ---------- US-21 · historial y revisión (contrato 15) ----------

    // Orden fijo del historial: la más reciente primero. El id desempata sesiones que empiezan en el mismo instante
    Sort HISTORY_SORT = Sort.by(Sort.Direction.DESC, "sessionDate", "startedAt", "id");

    // Sesiones cerradas del atleta entre from y to (opcionales e inclusivos sobre sessionDate). Toma la página y el
    // tamaño pedidos e ignora el sort del cliente. Método default: Spring Data no lo interpreta como consulta derivada
    default Page<TrainingSession> findHistory(UUID athleteId, LocalDate from, LocalDate to, Pageable pageable) {
        Specification<TrainingSession> spec = Specification.allOf(
                belongsToAthlete(athleteId),
                closed(),
                sessionDateOnOrAfter(from),
                sessionDateOnOrBefore(to));
        return findAll(spec, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), HISTORY_SORT));
    }

    // Las sesiones de la página con su asignación, su rutina y su día (para nombrar la rutina y el día). Solo fetch de
    // ManyToOne: sin colecciones, así que no hay MultipleBagFetchException ni productos cartesianos
    @Query("""
            select s from TrainingSession s
            join fetch s.assignment a
            join fetch a.routine
            join fetch s.routineDay
            where s.id in :sessionIds""")
    List<TrainingSession> findHistoryDetails(@Param("sessionIds") Collection<UUID> sessionIds);

    // Una sola consulta agregada para todas las sesiones de la página (contrato 15.3, sin N+1). Por sesión: las series
    // prescritas (suma de sets de los ejercicios de su día), las realizadas, las omitidas y el volumen de las
    // realizadas. Cada agregado va en su subconsulta: unir las dos tablas directamente multiplicaría las filas y las
    // sumas saldrían mal. Una sesión sin series da 0 (coalesce). Columnas: id, prescritas, realizadas, omitidas, volumen
    @Query(value = """
            select s.id,
                   coalesce(p.prescribed, 0),
                   coalesce(r.done_count, 0),
                   coalesce(r.skipped_count, 0),
                   coalesce(r.volume, 0)
              from training_sessions s
              left join (select routine_day_id, sum(sets) as prescribed
                           from routine_exercises
                          group by routine_day_id) p on p.routine_day_id = s.routine_day_id
              left join (select training_session_id,
                                count(*) filter (where status_id = :doneStatusId) as done_count,
                                count(*) filter (where status_id = :skippedStatusId) as skipped_count,
                                sum(weight_kg * reps) filter (where status_id = :doneStatusId) as volume
                           from performed_sets
                          group by training_session_id) r on r.training_session_id = s.id
             where s.id in (:sessionIds)""", nativeQuery = true)
    List<Object[]> findSummaryRows(@Param("sessionIds") Collection<UUID> sessionIds,
                                   @Param("doneStatusId") short doneStatusId,
                                   @Param("skippedStatusId") short skippedStatusId);
}
