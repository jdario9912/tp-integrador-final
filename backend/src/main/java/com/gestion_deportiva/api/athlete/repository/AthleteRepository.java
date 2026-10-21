package com.gestion_deportiva.api.athlete.repository;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.user.repository.UserBaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AthleteRepository extends UserBaseRepository<Athlete> {

    // "Mis atletas" del entrenador, paginado (US-08)
    Page<Athlete> findByCoachId(UUID coachId, Pageable pageable);

    // Verificación de pertenencia sin cargar la entidad (US-04)
    boolean existsByIdAndCoachId(UUID athleteId, UUID coachId);
}
