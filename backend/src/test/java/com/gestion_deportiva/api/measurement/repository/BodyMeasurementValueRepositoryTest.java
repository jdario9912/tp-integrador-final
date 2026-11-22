package com.gestion_deportiva.api.measurement.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.measurement;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BodyMeasurementValueRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);
    private static final LocalDate NOV_7 = LocalDate.of(2026, 11, 7);

    @Autowired
    private BodyMeasurementRecordRepository recordRepository;

    @Autowired
    private BodyMeasurementValueRepository valueRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbc;

    private Athlete leo;

    private BodyMeasurementRecord record;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        record = recordRepository.saveAndFlush(record(leo, NOV_6));
    }

    // El converter guarda el id del catálogo (ARM = 4) y el lado como texto; el null de las no bilaterales queda null
    @Test
    void storesTheTypeAsItsCatalogIdAndTheSideAsText() {
        valueRepository.saveAllAndFlush(List.of(
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT, "34.8"),
                measurement(record, BodyMeasurementType.WAIST, null, "84.5")));

        Map<String, Object> arm = jdbc.queryForMap("select type_id, side, value from body_measurement_values"
                + " where record_id = ? and type_id = 4", record.getId());
        assertEquals("LEFT", arm.get("side"));
        assertEquals(new BigDecimal("34.80"), arm.get("value"));
        assertNull(jdbc.queryForObject("select side from body_measurement_values where record_id = ? and type_id = 1",
                String.class, record.getId()));
    }

    // Se lee de la base (no del contexto de persistencia): el converter vuelve a dar el enum
    @Test
    void readsTheValuesBackWithTheirTypeAndSide() {
        valueRepository.saveAllAndFlush(List.of(
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35.25"),
                measurement(record, BodyMeasurementType.LEG, MeasurementSide.LEFT, "55")));
        entityManager.flush();
        entityManager.clear();

        List<BodyMeasurementValue> values = valueRepository.findByRecordIdIn(List.of(record.getId()));

        assertEquals(2, values.size());
        assertTrue(values.stream().anyMatch(value -> value.getType() == BodyMeasurementType.ARM
                && value.getSide() == MeasurementSide.RIGHT
                && value.getValue().compareTo(new BigDecimal("35.25")) == 0));
        assertTrue(values.stream().anyMatch(value -> value.getType() == BodyMeasurementType.LEG
                && value.getSide() == MeasurementSide.LEFT));
    }

    @Test
    void findsOnlyTheValuesOfTheGivenRecords() {
        BodyMeasurementRecord other = recordRepository.saveAndFlush(record(leo, NOV_7));
        valueRepository.saveAllAndFlush(List.of(measurement(record, BodyMeasurementType.WAIST, null, "84.5")));
        valueRepository.saveAllAndFlush(List.of(measurement(other, BodyMeasurementType.HIP, null, "95")));

        List<BodyMeasurementValue> values = valueRepository.findByRecordIdIn(List.of(other.getId()));

        assertEquals(1, values.size());
        assertEquals(BodyMeasurementType.HIP, values.get(0).getType());
        assertEquals(other.getId(), values.get(0).getRecord().getId());
    }

    // El reemplazo del PUT: se borran las medidas del registro (y no las de otro), y la lista nueva puede repetir
    // tipo y lado de las anteriores porque el DELETE ya corrió
    @Test
    void deleteByRecordIdRemovesOnlyThatRecordsValuesAndFreesTheirTypeAndSide() {
        BodyMeasurementRecord other = recordRepository.saveAndFlush(record(leo, NOV_7));
        valueRepository.saveAllAndFlush(List.of(measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT,
                "34.8")));
        valueRepository.saveAllAndFlush(List.of(measurement(other, BodyMeasurementType.ARM, MeasurementSide.LEFT,
                "33")));

        valueRepository.deleteByRecordId(record.getId());
        valueRepository.saveAllAndFlush(List.of(measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT,
                "36")));

        assertEquals(1, count(record.getId()));
        assertEquals(1, count(other.getId()));
        assertEquals(new BigDecimal("36.00"), jdbc.queryForObject("select value from body_measurement_values"
                + " where record_id = ?", BigDecimal.class, record.getId()));
    }

    // Un tipo y un lado por registro: dos veces el mismo lado de la bilateral choca
    @Test
    void rejectsTheSameTypeAndSideTwiceInARecord() {
        valueRepository.saveAndFlush(measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT, "34"));

        assertThrows(DataIntegrityViolationException.class, () -> valueRepository.saveAndFlush(
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT, "35")));
    }

    // NULLS NOT DISTINCT: dos medidas sin lado del mismo tipo también chocan (sin esto, NULL no se compara)
    @Test
    void rejectsTheSameUnilateralTypeTwiceInARecord() {
        valueRepository.saveAndFlush(measurement(record, BodyMeasurementType.WAIST, null, "84"));

        assertThrows(DataIntegrityViolationException.class, () -> valueRepository.saveAndFlush(
                measurement(record, BodyMeasurementType.WAIST, null, "85")));
    }

    @Test
    void allowsBothSidesOfABilateralMeasurement() {
        valueRepository.saveAllAndFlush(List.of(
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.LEFT, "34"),
                measurement(record, BodyMeasurementType.ARM, MeasurementSide.RIGHT, "35")));

        assertEquals(2, count(record.getId()));
    }

    // Borrar un registro se lleva sus medidas (ON DELETE CASCADE de la V20)
    @Test
    void deletingARecordCascadesToItsValues() {
        valueRepository.saveAllAndFlush(List.of(measurement(record, BodyMeasurementType.WAIST, null, "84.5")));

        jdbc.update("delete from body_measurement_records where id = ?", record.getId());

        assertEquals(0, count(record.getId()));
    }

    private int count(java.util.UUID recordId) {
        Integer count = jdbc.queryForObject("select count(*) from body_measurement_values where record_id = ?",
                Integer.class, recordId);
        return count == null ? 0 : count;
    }
}
