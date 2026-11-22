package com.gestion_deportiva.api.measurement.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Las restricciones de la V20 en la base (las mismas reglas de dominio, por si alguien escribe sin la aplicación).
// Cada prueba intenta una fila inválida y espera el rechazo de Postgres
class BodyMeasurementMigrationTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BodyMeasurementRecordRepository recordRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    private Athlete leo;

    private BodyMeasurementRecord record;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        record = recordRepository.saveAndFlush(record(leo, NOV_6));
    }

    @Test
    void appliesTheV20Migration() {
        Integer applied = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version = '20' and success", Integer.class);

        assertEquals(1, applied);
    }

    // La consulta del listado (por atleta y fecha descendente) tiene su índice
    @Test
    void createsTheIndexForTheNewestFirstListing() {
        Integer count = jdbc.queryForObject("select count(*) from pg_indexes"
                + " where indexname = 'ix_body_measurement_records_athlete_measured'"
                + " and indexdef like '%measured_on DESC%'", Integer.class);

        assertEquals(1, count);
    }

    // Un solo rechazo por prueba: en Postgres, un error deja la transacción abortada y el siguiente insert falla por eso
    @Test
    void rejectsAZeroValue() {
        assertThrows(DataIntegrityViolationException.class, () -> insertValue(record.getId(), 1, null, "0"));
    }

    @Test
    void rejectsANegativeValue() {
        assertThrows(DataIntegrityViolationException.class, () -> insertValue(record.getId(), 1, null, "-1"));
    }

    @Test
    void rejectsASideThatIsNotLeftOrRight() {
        assertThrows(DataIntegrityViolationException.class, () -> insertValue(record.getId(), 4, "UP", "34"));
    }

    @Test
    void acceptsASideOfLeftOrRightAndNoSide() {
        insertValue(record.getId(), 4, "LEFT", "34");
        insertValue(record.getId(), 1, null, "84");
    }

    @Test
    void rejectsACommentOfOnlySpaces() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update body_measurement_records set comment = ? where id = ?", "   ", record.getId()));
    }

    // Un registro por día: la restricción de la tabla, no solo el service
    @Test
    void rejectsTwoRecordsOfTheSameAthleteOnTheSameDay() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into body_measurement_records (athlete_id, measured_on) values (?, ?)",
                leo.getId(), NOV_6));
    }

    // Un rango del catálogo con mínimo igual o mayor al máximo no puede existir
    @Test
    void rejectsACatalogRangeWhereTheMinimumIsNotBelowTheMaximum() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into body_measurement_types (id, code, name, unit, bilateral, min_value, max_value)"
                        + " values (99, 'BAD', 'Inválida', 'cm', false, 10, 10)"));
    }

    private void insertValue(UUID recordId, int typeId, String side, String value) {
        jdbc.update("insert into body_measurement_values (record_id, type_id, side, value) values (?, ?, ?, ?)",
                recordId, typeId, side, new java.math.BigDecimal(value));
    }
}
