package com.gestion_deportiva.api.athlete.repository;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.user.repository.UserBaseRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

// JpaSpecificationExecutor: "Mis atletas" del entrenador, paginado y con filtros opcionales (US-08, ver
// AthleteSpecifications)
public interface AthleteRepository extends UserBaseRepository<Athlete>, JpaSpecificationExecutor<Athlete> {

    // Verificación de pertenencia sin cargar la entidad (US-04)
    boolean existsByIdAndCoachId(UUID athleteId, UUID coachId);
}
