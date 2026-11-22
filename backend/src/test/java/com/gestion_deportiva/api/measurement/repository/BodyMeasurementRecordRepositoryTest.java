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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.BodyMeasurementFixtures.record;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BodyMeasurementRecordRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_1 = LocalDate.of(2026, 11, 1);
    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_5 = LocalDate.of(2026, 11, 5);
    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);

    @Autowired
    private BodyMeasurementRecordRepository recordRepository;

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private Athlete leo;

    private Athlete mia;

    @BeforeEach
    void setUp() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        leo = athleteRepository.saveAndFlush(athlete("leo@test.com", ana));
        mia = athleteRepository.saveAndFlush(athlete("mia@test.com", ana));
    }

    @Test
    void savesTheRecordWithItsAthleteAndTimestamps() {
        // Act
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(record(leo, NOV_6, "Después de entrenar"));

        // Assert
        Map<String, Object> row = jdbc.queryForMap(
                "select athlete_id, measured_on, comment, created_at, updated_at from body_measurement_records"
                        + " where id = ?", saved.getId());
        assertEquals(leo.getId(), row.get("athlete_id"));
        assertEquals(NOV_6, ((java.sql.Date) row.get("measured_on")).toLocalDate());
        assertEquals("Después de entrenar", row.get("comment"));
        assertEquals(CREATED_AT, ((Timestamp) row.get("created_at")).toInstant());
        assertEquals(CREATED_AT, ((Timestamp) row.get("updated_at")).toInstant());
    }

    @Test
    void savesABlankCommentAsNull() {
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(record(leo, NOV_6, "   "));

        assertNull(jdbc.queryForObject("select comment from body_measurement_records where id = ?", String.class,
                saved.getId()));
    }

    // timestamptz guarda microsegundos: el registro lo guarda truncado y el alta responde lo mismo que el listado
    @Test
    void truncatesTheTimestampsToMicroseconds() {
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(new BodyMeasurementRecord(leo, NOV_6, null,
                Instant.parse("2026-11-01T12:00:00.123456789Z")));

        Timestamp createdAt = jdbc.queryForObject("select created_at from body_measurement_records where id = ?",
                Timestamp.class, saved.getId());
        assertEquals(Instant.parse("2026-11-01T12:00:00.123456Z"), createdAt.toInstant());
    }

    // ---------- un registro por día ----------

    @Test
    void secondRecordOnTheSameDayForTheSameAthleteIsRejectedByTheDatabase() {
        recordRepository.saveAndFlush(record(leo, NOV_6));

        assertThrows(DataIntegrityViolationException.class, () -> recordRepository.saveAndFlush(record(leo, NOV_6)));
    }

    @Test
    void anotherAthleteCanRecordTheSameDay() {
        recordRepository.saveAndFlush(record(leo, NOV_6));

        assertEquals(mia.getId(), recordRepository.saveAndFlush(record(mia, NOV_6)).getAthlete().getId());
    }

    @Test
    void reportsWhetherTheAthleteHasARecordOnADay() {
        recordRepository.saveAndFlush(record(leo, NOV_6));

        assertTrue(recordRepository.existsByAthleteIdAndMeasuredOn(leo.getId(), NOV_6));
        assertFalse(recordRepository.existsByAthleteIdAndMeasuredOn(leo.getId(), NOV_5));
        assertFalse(recordRepository.existsByAthleteIdAndMeasuredOn(mia.getId(), NOV_6));
    }

    // El registro de otro atleta no se encuentra: el service responde 404 igual que a uno inexistente
    @Test
    void findsARecordOnlyForItsOwnAthlete() {
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(record(leo, NOV_6));

        assertTrue(recordRepository.findByIdAndAthleteId(saved.getId(), leo.getId()).isPresent());
        assertTrue(recordRepository.findByIdAndAthleteId(saved.getId(), mia.getId()).isEmpty());
    }

    // ---------- listado ----------

    @Test
    void listsTheAthletesRecordsFromTheNewestAndFiltersByAnInclusiveRange() {
        // Arrange
        recordRepository.saveAllAndFlush(List.of(record(leo, NOV_1), record(leo, NOV_3), record(leo, NOV_5),
                record(leo, NOV_6), record(mia, NOV_3)));

        // Act
        Page<BodyMeasurementRecord> page = recordRepository.findNewestFirst(leo.getId(), NOV_3, NOV_5,
                PageRequest.of(0, 10));

        // Assert: NOV_3 y NOV_5 incluidos, el de mia no
        assertEquals(List.of(NOV_5, NOV_3), page.getContent().stream().map(BodyMeasurementRecord::getMeasuredOn)
                .toList());
        assertEquals(2, page.getTotalElements());
    }

    @Test
    void paginatesTheNewestFirst() {
        recordRepository.saveAllAndFlush(List.of(record(leo, NOV_1), record(leo, NOV_3), record(leo, NOV_5),
                record(leo, NOV_6)));

        Page<BodyMeasurementRecord> second = recordRepository.findNewestFirst(leo.getId(), null, null,
                PageRequest.of(1, 2));

        assertEquals(List.of(NOV_3, NOV_1), second.getContent().stream().map(BodyMeasurementRecord::getMeasuredOn)
                .toList());
        assertEquals(4, second.getTotalElements());
        assertEquals(2, second.getTotalPages());
    }

    // El orden lo fija el método: el sort que pide el cliente se ignora
    @Test
    void ignoresTheSortOfThePageable() {
        recordRepository.saveAllAndFlush(List.of(record(leo, NOV_1), record(leo, NOV_6)));

        Page<BodyMeasurementRecord> page = recordRepository.findNewestFirst(leo.getId(), null, null,
                PageRequest.of(0, 10, Sort.by("measuredOn").ascending()));

        assertEquals(List.of(NOV_6, NOV_1), page.getContent().stream().map(BodyMeasurementRecord::getMeasuredOn)
                .toList());
    }

    @Test
    void returnsAnEmptyPageWhenTheAthleteHasNoRecords() {
        Page<BodyMeasurementRecord> page = recordRepository.findNewestFirst(leo.getId(), null, null,
                PageRequest.of(0, 10));

        assertTrue(page.getContent().isEmpty());
        assertEquals(0, page.getTotalElements());
    }
}
