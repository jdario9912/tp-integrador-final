package com.gestion_deportiva.api.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.model.enums.AthleteStatus;
import com.gestion_deportiva.api.model.enums.CatalogEnum;
import com.gestion_deportiva.api.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.model.enums.Role;
import com.gestion_deportiva.api.model.enums.Sex;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Los enums de Java y las tablas catálogo de la migración nunca deben desincronizarse
class CatalogSchemaTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void enumsMatchTheirCatalogTables() {
        assertCatalogInSync("roles", Role.values());
        assertCatalogInSync("sexes", Sex.values());
        assertCatalogInSync("experience_levels", ExperienceLevel.values());
        assertCatalogInSync("athlete_statuses", AthleteStatus.values());
    }

    @Test
    void requiresAttentionMatchesTheTable() {
        Map<String, Boolean> fromDb = jdbc.queryForList("select code, requires_attention from athlete_statuses").stream()
                .collect(Collectors.toMap(row -> (String) row.get("code"), row -> (Boolean) row.get("requires_attention")));

        for (AthleteStatus status : AthleteStatus.values()) {
            assertEquals(status.requiresAttention(), fromDb.get(status.name()), status.name());
        }
    }

    @Test
    void flywayAppliedTheMigration() {
        Integer applied = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version = '1' and success", Integer.class);
        assertTrue(applied != null && applied == 1);
    }

    private void assertCatalogInSync(String table, CatalogEnum[] values) {
        Map<Short, String> fromDb = jdbc.queryForList("select id, code from " + table).stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row.get("id")).shortValue(),
                        row -> (String) row.get("code")));

        Map<Short, String> fromJava = Arrays.stream(values)
                .collect(Collectors.toMap(CatalogEnum::getId, value -> ((Enum<?>) value).name()));

        assertEquals(fromJava, fromDb, "catálogo " + table + " vs enum");
    }
}
