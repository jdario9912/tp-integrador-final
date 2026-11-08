package com.gestion_deportiva.api.weight.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.weight.model.WeightRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.CREATED_AT;
import static com.gestion_deportiva.api.support.WeightRecordFixtures.weightRecord;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeightRecordRepositoryTest extends AbstractIntegrationTest {

    private static final LocalDate NOV_1 = LocalDate.of(2026, 11, 1);
    private static final LocalDate NOV_3 = LocalDate.of(2026, 11, 3);
    private static final LocalDate NOV_5 = LocalDate.of(2026, 11, 5);
    private static final LocalDate NOV_6 = LocalDate.of(2026, 11, 6);

    @Autowired
    private WeightRecordRepository weightRecordRepository;

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
        WeightRecord saved = weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5", "En ayunas"));

        // Assert
        Map<String, Object> row = jdbc.queryForMap(
                "select athlete_id, recorded_on, weight_kg, comment, created_at, updated_at"
                        + " from weight_records where id = ?", saved.getId());
        assertEquals(leo.getId(), row.get("athlete_id"));
        assertEquals(NOV_6, ((java.sql.Date) row.get("recorded_on")).toLocalDate());
        assertEquals(new BigDecimal("72.50"), row.get("weight_kg"));
        assertEquals("En ayunas", row.get("comment"));
        assertEquals(CREATED_AT, ((Timestamp) row.get("created_at")).toInstant());
        assertEquals(CREATED_AT, ((Timestamp) row.get("updated_at")).toInstant());
    }

    @Test
    void savesABlankCommentAsNull() {
        WeightRecord saved = weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5", "   "));

        assertNull(jdbc.queryForObject("select comment from weight_records where id = ?", String.class,
                saved.getId()));
    }

    // ---------- un registro por día ----------

    @Test
    void secondRecordOnTheSameDayForTheSameAthleteIsRejectedByTheDatabase() {
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));

        assertThrows(DataIntegrityViolationException.class,
                () -> weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "73")));
    }

    @Test
    void sameDayIsAllowedForAnotherAthlete() {
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));
        weightRecordRepository.saveAndFlush(weightRecord(mia, NOV_6, "60"));

        assertEquals(2, count());
    }

    @Test
    void existsByAthleteIdAndRecordedOnOnlyLooksAtThatAthletesDay() {
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));

        assertTrue(weightRecordRepository.existsByAthleteIdAndRecordedOn(leo.getId(), NOV_6));
        assertFalse(weightRecordRepository.existsByAthleteIdAndRecordedOn(leo.getId(), NOV_5));
        assertFalse(weightRecordRepository.existsByAthleteIdAndRecordedOn(mia.getId(), NOV_6));
    }

    @Test
    void movingARecordToAnOccupiedDayIsRejectedByTheDatabase() {
        // Arrange
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));
        WeightRecord other = weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_5, "73"));

        // Act
        other.correct(NOV_6, new BigDecimal("73"), null, CREATED_AT.plusSeconds(60));

        // Assert
        assertThrows(DataIntegrityViolationException.class, () -> weightRecordRepository.saveAndFlush(other));
    }

    // ---------- búsqueda del registro de un atleta ----------

    @Test
    void findByIdAndAthleteIdOnlyReturnsTheRecordToItsAthlete() {
        WeightRecord saved = weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));

        assertTrue(weightRecordRepository.findByIdAndAthleteId(saved.getId(), leo.getId()).isPresent());
        assertTrue(weightRecordRepository.findByIdAndAthleteId(saved.getId(), mia.getId()).isEmpty());
        assertTrue(weightRecordRepository.findByIdAndAthleteId(UUID.randomUUID(), leo.getId()).isEmpty());
    }

    // ---------- listado ----------

    @Test
    void findNewestFirstReturnsOnlyTheAthletesRecordsFromTheNewestPaged() {
        // Arrange: guardados desordenados
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_3, "73"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_1, "74"));
        weightRecordRepository.saveAndFlush(weightRecord(mia, NOV_5, "60"));

        // Act
        Page<WeightRecord> firstPage = weightRecordRepository.findNewestFirst(leo.getId(), null, null,
                PageRequest.of(0, 2));
        Page<WeightRecord> secondPage = weightRecordRepository.findNewestFirst(leo.getId(), null, null,
                PageRequest.of(1, 2));

        // Assert
        assertEquals(List.of(NOV_6, NOV_3), dates(firstPage));
        assertEquals(List.of(NOV_1), dates(secondPage));
        assertEquals(3, firstPage.getTotalElements());
        assertEquals(2, firstPage.getTotalPages());
    }

    @Test
    void findNewestFirstIgnoresTheSortRequested() {
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_1, "74"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));

        Page<WeightRecord> page = weightRecordRepository.findNewestFirst(leo.getId(), null, null,
                PageRequest.of(0, 10, Sort.by("weightKg")));

        assertEquals(List.of(NOV_6, NOV_1), dates(page));
    }

    @Test
    void findNewestFirstFiltersByAnInclusiveRange() {
        // Arrange
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_1, "74"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_3, "73"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_5, "72.8"));
        weightRecordRepository.saveAndFlush(weightRecord(leo, NOV_6, "72.5"));
        PageRequest page = PageRequest.of(0, 10);

        // Act + Assert
        assertEquals(List.of(NOV_5, NOV_3), dates(weightRecordRepository.findNewestFirst(leo.getId(), NOV_3, NOV_5,
                page)));
        assertEquals(List.of(NOV_6, NOV_5), dates(weightRecordRepository.findNewestFirst(leo.getId(), NOV_5, null,
                page)));
        assertEquals(List.of(NOV_3, NOV_1), dates(weightRecordRepository.findNewestFirst(leo.getId(), null, NOV_3,
                page)));
        // Un solo día (flujo del 409: buscar el registro de esa fecha)
        assertEquals(List.of(NOV_6), dates(weightRecordRepository.findNewestFirst(leo.getId(), NOV_6, NOV_6,
                page)));
        // Rango sin registros
        Page<WeightRecord> empty = weightRecordRepository.findNewestFirst(leo.getId(), NOV_6.plusDays(1), null,
                page);
        assertTrue(empty.getContent().isEmpty());
        assertEquals(0, empty.getTotalElements());
    }

    // ---------- restricciones de la base ----------

    @ParameterizedTest
    @ValueSource(strings = {"19.99", "300.01"})
    void weightOutOfRangeIsRejectedByTheDatabase(String weightKg) {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into weight_records (athlete_id, recorded_on, weight_kg) values (?, ?, ?)",
                leo.getId(), NOV_6, new BigDecimal(weightKg)));
    }

    @Test
    void blankCommentIsRejectedByTheDatabase() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into weight_records (athlete_id, recorded_on, weight_kg, comment) values (?, ?, 72.5, '  ')",
                leo.getId(), NOV_6));
    }

    @Test
    void recordOfAnUnknownAthleteIsRejectedByTheDatabase() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into weight_records (athlete_id, recorded_on, weight_kg) values (?, ?, 72.5)",
                UUID.randomUUID(), NOV_6));
    }

    private static List<LocalDate> dates(Page<WeightRecord> page) {
        return page.getContent().stream().map(WeightRecord::getRecordedOn).toList();
    }

    private int count() {
        Integer count = jdbc.queryForObject("select count(*) from weight_records", Integer.class);
        return count == null ? 0 : count;
    }
}
