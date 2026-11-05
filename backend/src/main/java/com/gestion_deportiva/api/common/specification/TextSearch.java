package com.gestion_deportiva.api.common.specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;

import java.util.Locale;

// Búsqueda "contiene" de los filtros de texto de las Specifications (atletas, ejercicios): sin distinguir
// mayúsculas y con % y _ escapados para que el texto del usuario se busque literal
public final class TextSearch {

    private static final char LIKE_ESCAPE = '\\';

    private TextSearch() {
    }

    public static Predicate like(CriteriaBuilder cb, Expression<String> field, String pattern) {
        return cb.like(cb.lower(field), pattern, LIKE_ESCAPE);
    }

    public static String containsPattern(String text) {
        String escaped = text.trim().toLowerCase(Locale.ROOT)
                .replace(String.valueOf(LIKE_ESCAPE), "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    public static boolean isBlank(String text) {
        return text == null || text.isBlank();
    }
}
