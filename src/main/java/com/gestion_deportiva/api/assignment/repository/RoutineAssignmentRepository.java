package com.gestion_deportiva.api.assignment.repository;

import com.gestion_deportiva.api.assignment.model.RoutineAssignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoutineAssignmentRepository extends JpaRepository<RoutineAssignment, UUID> {

    // Orden fijo del historial: primero la activa y después de la más reciente a la más antigua.
    // El id desempata dos asignaciones del mismo día para que la paginación sea estable
    Sort HISTORY_SORT = Sort.by(Sort.Order.desc("active"), Sort.Order.desc("assignmentDate"), Sort.Order.asc("id"));

    // A lo sumo una (ux_routine_assignments_athlete_active). Trae la rutina: el 409 nombra la activa
    @EntityGraph(attributePaths = "routine")
    Optional<RoutineAssignment> findByAthleteIdAndActiveTrue(UUID athleteId);

    // Trae la rutina en la misma consulta: la respuesta lee su nombre (sin N+1)
    @EntityGraph(attributePaths = "routine")
    Page<RoutineAssignment> findByAthleteId(UUID athleteId, Pageable pageable);

    // Toma la página y el tamaño pedidos e ignora el sort del cliente. Método default: Spring Data no lo
    // interpreta como consulta derivada
    default Page<RoutineAssignment> findHistory(UUID athleteId, Pageable pageable) {
        return findByAthleteId(athleteId,
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), HISTORY_SORT));
    }
}
