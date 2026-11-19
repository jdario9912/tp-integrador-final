package com.gestion_deportiva.api.alert.repository;

import com.gestion_deportiva.api.alert.model.Alert;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {

    // Tipos que la evaluación no vuelve a generar para el atleta: los que tienen una alerta abierta y los atendidos
    // desde "since" (período de gracia: si la condición sigue, la alerta no reaparece apenas se atiende)
    @Query("""
            select a.type from Alert a
             where a.athlete.id = :athleteId and (a.handledAt is null or a.handledAt >= :since)""")
    Set<AlertType> findBlockedTypes(@Param("athleteId") UUID athleteId, @Param("since") Instant since);

    // Pendientes de los atletas activos de la cartera, con el atleta cargado (nombre en la respuesta, sin N+1).
    // El orden por severidad lo hace el service: la severidad vive en el enum, no en la fila
    @Query("""
            select a from Alert a join fetch a.athlete at
             where at.coach.id = :coachId and at.active and a.handledAt is null""")
    List<Alert> findPendingByCoach(@Param("coachId") UUID coachId);

    @Query("select a from Alert a join fetch a.athlete where a.id = :id")
    Optional<Alert> findByIdWithAthlete(@Param("id") UUID id);

    // Umbral y texto de cada tipo (catálogo alert_types)
    @Query(value = """
            select code as "code", threshold_days as "thresholdDays", message_template as "messageTemplate"
              from alert_types""", nativeQuery = true)
    List<AlertTypeRule> findTypeRules();
}
