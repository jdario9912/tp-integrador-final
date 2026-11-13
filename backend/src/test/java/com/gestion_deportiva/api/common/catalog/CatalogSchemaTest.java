package com.gestion_deportiva.api.common.catalog;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.user.model.enums.Role;
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
        assertCatalogInSync("muscle_groups", MuscleGroup.values());
        assertCatalogInSync("session_statuses", SessionStatus.values());
    }

    @Test
    void muscleGroupNamesAndRegionsMatchTheTable() {
        Map<String, String> fromDb = jdbc.queryForList("select code, name, region from muscle_groups").stream()
                .collect(Collectors.toMap(row -> (String) row.get("code"),
                        row -> row.get("name") + "|" + row.get("region")));

        for (MuscleGroup group : MuscleGroup.values()) {
            assertEquals(group.getDisplayName() + "|" + group.getRegion().name(), fromDb.get(group.name()), group.name());
        }
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
    void isFinalMatchesTheTable() {
        Map<String, Boolean> fromDb = jdbc.queryForList("select code, is_final from session_statuses").stream()
                .collect(Collectors.toMap(row -> (String) row.get("code"), row -> (Boolean) row.get("is_final")));

        for (SessionStatus status : SessionStatus.values()) {
            assertEquals(status.isFinal(), fromDb.get(status.name()), status.name());
        }
    }

    @Test
    void flywayAppliedTheMigrations() {
        Integer applied = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version in ('1', '2', '3') and success",
                Integer.class);
        assertTrue(applied != null && applied == 3);
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
