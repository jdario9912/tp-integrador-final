package com.gestion_deportiva.api.meal.repository;

import com.gestion_deportiva.api.meal.model.Meal;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MealRepository extends JpaRepository<Meal, UUID> {

    // La comida solo si es de ese atleta: la de otro atleta responde igual que una inexistente (404)
    Optional<Meal> findByIdAndAthleteId(UUID id, UUID athleteId);

    // Comidas del día del atleta, en el orden del listado (contrato 11.7): por tipo del catálogo (que es el id) y,
    // dentro de cada tipo, por alta. El id desempata. Los ítems vienen en la misma consulta (sin N+1)
    @EntityGraph(attributePaths = "items")
    @Query("select m from Meal m where m.athlete.id = :athleteId and m.eatenOn = :eatenOn"
            + " order by m.type, m.createdAt, m.id")
    List<Meal> findDay(@Param("athleteId") UUID athleteId, @Param("eatenOn") LocalDate eatenOn);
}
