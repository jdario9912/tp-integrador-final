package com.gestion_deportiva.api.repository;

import com.gestion_deportiva.api.model.Athlete;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AthleteRepository extends JpaRepository<Athlete, UUID> {

    @Query("select a from Athlete a where lower(a.email) = lower(:email)")
    Optional<Athlete> findByEmail(@Param("email") String email);

    // "Mis atletas" del entrenador, paginado (US-08)
    Page<Athlete> findByCoachId(UUID coachId, Pageable pageable);

    // Verificación de pertenencia sin cargar la entidad (US-04)
    boolean existsByIdAndCoachId(UUID athleteId, UUID coachId);
}
