package com.gestion_deportiva.api.routine.repository;

import com.gestion_deportiva.api.routine.model.Routine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

    // Nombre repetido entre las rutinas del entrenador (ux_routines_coach_name)
    boolean existsByCoachIdAndNameIgnoreCase(UUID coachId, String name);

    // Lo mismo, sin contar la rutina que se está editando (US-15)
    boolean existsByCoachIdAndNameIgnoreCaseAndIdNot(UUID coachId, String name, UUID routineId);

    // "Mis rutinas" (US-13)
    Page<Routine> findByCoachId(UUID coachId, Pageable pageable);
}
