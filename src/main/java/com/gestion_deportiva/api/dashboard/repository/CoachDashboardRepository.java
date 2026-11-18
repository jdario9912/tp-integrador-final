package com.gestion_deportiva.api.dashboard.repository;

import com.gestion_deportiva.api.athlete.model.Athlete;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// US-11 · Métricas del dashboard del entrenador: una consulta agregada por métrica para toda la cartera (sin N+1).
// Todas filtran por el entrenador y solo cuentan atletas activos (users.active). Son SQL nativo, así que el
// @SQLRestriction de User no aplica: el "deleted_at is null" va escrito a mano. Orden: apellido, nombre e id
public interface CoachDashboardRepository extends Repository<Athlete, UUID> {

    // Atletas activos de la cartera
    @Query(value = """
            select u.id as "id", u.first_name as "firstName", u.last_name as "lastName"
              from athletes a
              join users u on u.id = a.user_id
             where a.coach_id = :coachId and u.active and u.deleted_at is null
             order by u.last_name, u.first_name, u.id""", nativeQuery = true)
    List<DashboardAthleteRow> findActiveAthletes(@Param("coachId") UUID coachId);

    // Activos sin una asignación activa y vigente. Vigente igual que RoutineAssignment.isExpiredOn: el último día es
    // assignment_date + semanas*7 - 1; sin duración no vence. Una asignación activa pero vencida cuenta como sin rutina
    @Query(value = """
            select u.id as "id", u.first_name as "firstName", u.last_name as "lastName"
              from athletes a
              join users u on u.id = a.user_id
             where a.coach_id = :coachId and u.active and u.deleted_at is null
               and not exists (select 1
                                 from routine_assignments ra
                                 join routines r on r.id = ra.routine_id
                                where ra.athlete_id = a.user_id and ra.active
                                  and (r.duration_weeks is null
                                       or ra.assignment_date + r.duration_weeks * 7 - 1 >= :today))
             order by u.last_name, u.first_name, u.id""", nativeQuery = true)
    List<DashboardAthleteRow> findAthletesWithoutRoutine(@Param("coachId") UUID coachId,
                                                         @Param("today") LocalDate today);

    // Activos con sesiones finalizadas que el entrenador todavía no revisó (US-21: reviewed_at nulo), con cuántas son.
    // Los que no tienen ninguna no aparecen
    @Query(value = """
            select u.id as "id", u.first_name as "firstName", u.last_name as "lastName",
                   count(*) as "pendingCount"
              from athletes a
              join users u on u.id = a.user_id
              join training_sessions s on s.athlete_id = a.user_id
             where a.coach_id = :coachId and u.active and u.deleted_at is null
               and s.status_id = :finishedStatusId and s.reviewed_at is null
             group by u.id, u.first_name, u.last_name
             order by u.last_name, u.first_name, u.id""", nativeQuery = true)
    List<PendingReviewRow> findPendingReviews(@Param("coachId") UUID coachId,
                                              @Param("finishedStatusId") short finishedStatusId);

    // Activos cuyo último peso es anterior al corte, o que nunca registraron uno. El lateral busca el máximo de cada
    // atleta con el índice único (athlete_id, recorded_on)
    @Query(value = """
            select u.id as "id", u.first_name as "firstName", u.last_name as "lastName",
                   w.last_recorded_on as "lastRecordedOn"
              from athletes a
              join users u on u.id = a.user_id
              left join lateral (select max(wr.recorded_on) as last_recorded_on
                                   from weight_records wr
                                  where wr.athlete_id = a.user_id) w on true
             where a.coach_id = :coachId and u.active and u.deleted_at is null
               and (w.last_recorded_on is null or w.last_recorded_on < :cutoff)
             order by u.last_name, u.first_name, u.id""", nativeQuery = true)
    List<WeightGapRow> findAthletesWithoutRecentWeight(@Param("coachId") UUID coachId,
                                                       @Param("cutoff") LocalDate cutoff);
}
