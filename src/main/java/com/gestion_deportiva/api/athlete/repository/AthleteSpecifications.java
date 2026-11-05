package com.gestion_deportiva.api.athlete.repository;

import com.gestion_deportiva.api.athlete.model.Athlete;
import jakarta.persistence.criteria.Expression;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

import static com.gestion_deportiva.api.common.specification.TextSearch.containsPattern;
import static com.gestion_deportiva.api.common.specification.TextSearch.isBlank;
import static com.gestion_deportiva.api.common.specification.TextSearch.like;

// Filtros de la búsqueda de atletas (US-08). Specifications y no JPQL con ":name is null": Postgres no puede
// inferir el tipo de un parámetro null y cada filtro opcional nuevo se suma sin reescribir la consulta
public final class AthleteSpecifications {

    private AthleteSpecifications() {
    }

    // Pertenencia: un atleta desvinculado (coach null) no le pertenece a ningún entrenador
    public static Specification<Athlete> belongsToCoach(UUID coachId) {
        return (root, query, cb) -> cb.equal(root.get("coach").get("id"), coachId);
    }

    public static Specification<Athlete> nameContains(String name) {
        if (isBlank(name)) return Specification.unrestricted();
        String pattern = containsPattern(name);
        return (root, query, cb) -> {
            Expression<String> firstName = root.get("firstName");
            Expression<String> lastName = root.get("lastName");
            Expression<String> fullName = cb.concat(cb.concat(firstName, " "), lastName);
            return cb.or(
                    like(cb, firstName, pattern),
                    like(cb, lastName, pattern),
                    like(cb, fullName, pattern));
        };
    }

    public static Specification<Athlete> goalContains(String goal) {
        if (isBlank(goal)) return Specification.unrestricted();
        String pattern = containsPattern(goal);
        return (root, query, cb) -> like(cb, root.get("goal"), pattern);
    }
}
