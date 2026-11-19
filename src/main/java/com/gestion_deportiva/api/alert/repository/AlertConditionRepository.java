package com.gestion_deportiva.api.alert.repository;

import com.gestion_deportiva.api.athlete.model.Athlete;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// US-47 · Condiciones de las alertas que no cubre CoachDashboardRepository (sin rutina, sesiones sin revisar y sin
// peso reciente se reutilizan de ahí). Una consulta por condición para toda la cartera (sin N+1). Solo atletas
// activos con una asignación activa y vigente (igual que RoutineAssignment.isExpiredOn) que empezó antes de la
// ventana: una rutina recién asignada no genera alertas. SQL nativo: el "deleted_at is null" va escrito a mano
public interface AlertConditionRepository extends Repository<Athlete, UUID> {

    // Entrenadores activos: el job diario evalúa la cartera de cada uno
    @Query(value = """
            select c.user_id
              from coaches c
              join users u on u.id = c.user_id
             where u.active and u.deleted_at is null""", nativeQuery = true)
    List<UUID> findActiveCoachIds();

    // Sin ninguna sesión finalizada desde el corte (inclusive)
    @Query(value = """
            select distinct a.user_id
              from athletes a
              join users u on u.id = a.user_id
              join routine_assignments ra on ra.athlete_id = a.user_id and ra.active
              join routines r on r.id = ra.routine_id
             where a.coach_id = :coachId and u.active and u.deleted_at is null
               and (r.duration_weeks is null or ra.assignment_date + r.duration_weeks * 7 - 1 >= :today)
               and ra.assignment_date < :cutoff
               and not exists (select 1
                                 from training_sessions s
                                where s.athlete_id = a.user_id and s.status_id = :finishedStatusId
                                  and s.session_date >= :cutoff)""", nativeQuery = true)
    List<UUID> findInactiveAthletes(@Param("coachId") UUID coachId, @Param("today") LocalDate today,
                                    @Param("cutoff") LocalDate cutoff,
                                    @Param("finishedStatusId") short finishedStatusId);

    // Rutinas con días por semana definidos y las sesiones finalizadas entre el corte y hoy. Si el cumplimiento es
    // bajo lo decide AlertEvaluator
    @Query(value = """
            select a.user_id as "athleteId", r.days_per_week as "daysPerWeek",
                   (select count(*)
                      from training_sessions s
                     where s.athlete_id = a.user_id and s.status_id = :finishedStatusId
                       and s.session_date between :cutoff and :today) as "finishedCount"
              from athletes a
              join users u on u.id = a.user_id
              join routine_assignments ra on ra.athlete_id = a.user_id and ra.active
              join routines r on r.id = ra.routine_id
             where a.coach_id = :coachId and u.active and u.deleted_at is null
               and r.days_per_week is not null
               and (r.duration_weeks is null or ra.assignment_date + r.duration_weeks * 7 - 1 >= :today)
               and ra.assignment_date < :cutoff""", nativeQuery = true)
    List<ComplianceRow> findCompliance(@Param("coachId") UUID coachId, @Param("today") LocalDate today,
                                       @Param("cutoff") LocalDate cutoff,
                                       @Param("finishedStatusId") short finishedStatusId);
}
