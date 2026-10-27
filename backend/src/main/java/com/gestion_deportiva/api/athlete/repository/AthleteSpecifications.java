package com.gestion_deportiva.api.athlete.repository;

import com.gestion_deportiva.api.athlete.model.Athlete;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;
import java.util.UUID;

// Filtros de la búsqueda de atletas (US-08). Specifications y no JPQL con ":name is null": Postgres no puede
// inferir el tipo de un parámetro null y cada filtro opcional nuevo se suma sin reescribir la consulta
public final class AthleteSpecifications {

    private static final char LIKE_ESCAPE = '\\';

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

    private static Predicate like(CriteriaBuilder cb, Expression<String> field, String pattern) {
        return cb.like(cb.lower(field), pattern, LIKE_ESCAPE);
    }

    // Contiene, sin distinguir mayúsculas. Se escapan % y _ para que el texto del usuario se busque literal
    private static String containsPattern(String text) {
        String escaped = text.trim().toLowerCase(Locale.ROOT)
                .replace(String.valueOf(LIKE_ESCAPE), "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static boolean isBlank(String text) {
        return text == null || text.isBlank();
    }
}
