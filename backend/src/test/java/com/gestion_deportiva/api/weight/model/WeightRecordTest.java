package com.gestion_deportiva.api.weight.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WeightRecordTest {

    private static final LocalDate DATE = LocalDate.of(2026, 11, 6);
    private static final Instant CREATED_AT = Instant.parse("2026-11-06T11:20:31.123456Z");

    private Athlete athlete;

    @BeforeEach
    void setUp() {
        athlete = athlete("leo@test.com", coach("ana@test.com"));
    }

    @Test
    void shouldKeepItsDataWithUpdatedAtEqualToCreatedAt() {
        // Act
        WeightRecord weightRecord = new WeightRecord(athlete, DATE, new BigDecimal("72.50"), "En ayunas",
                CREATED_AT);

        // Assert
        assertSame(athlete, weightRecord.getAthlete());
        assertEquals(DATE, weightRecord.getRecordedOn());
        assertEquals(new BigDecimal("72.50"), weightRecord.getWeightKg());
        assertEquals("En ayunas", weightRecord.getComment());
        assertEquals(CREATED_AT, weightRecord.getCreatedAt());
        assertEquals(CREATED_AT, weightRecord.getUpdatedAt());
        assertNull(weightRecord.getId());
    }

    @Test
    void shouldStoreTheWeightWithTwoDecimals() {
        assertEquals(new BigDecimal("72.50"), withWeight("72.5").getWeightKg());
        assertEquals(new BigDecimal("100.00"), withWeight("100").getWeightKg());
        assertEquals(new BigDecimal("100.00"), withWeight("1E+2").getWeightKg());
        assertEquals(new BigDecimal("72.50"), withWeight("72.500").getWeightKg());
    }

    @ParameterizedTest
    @ValueSource(strings = {"20", "20.00", "300", "299.99"})
    void shouldAcceptTheLimitsOfTheRange(String weightKg) {
        assertEquals(0, new BigDecimal(weightKg).compareTo(withWeight(weightKg).getWeightKg()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"19.99", "300.01", "0", "-72.5"})
    void shouldRejectAWeightOutOfRange(String weightKg) {
        assertThrows(IllegalArgumentException.class, () -> withWeight(weightKg));
    }

    @Test
    void shouldRejectMoreThanTwoDecimalsInsteadOfRounding() {
        assertThrows(IllegalArgumentException.class, () -> withWeight("72.555"));
    }

    @Test
    void shouldTrimTheComment() {
        assertEquals("En ayunas", withComment("  En ayunas  ").getComment());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "   ", "\t\n"})
    void shouldStoreABlankCommentAsNull(String comment) {
        assertNull(withComment(comment).getComment());
    }

    @Test
    void shouldTruncateTheTimestampsToMicroseconds() {
        WeightRecord weightRecord = new WeightRecord(athlete, DATE, new BigDecimal("72.5"), null,
                Instant.parse("2026-11-06T11:20:31.123456789Z"));

        assertEquals(CREATED_AT, weightRecord.getCreatedAt());
        assertEquals(CREATED_AT, weightRecord.getUpdatedAt());
    }

    @Test
    void shouldRejectMissingRequiredData() {
        BigDecimal weight = new BigDecimal("72.5");

        assertThrows(NullPointerException.class, () -> new WeightRecord(null, DATE, weight, null, CREATED_AT));
        assertThrows(NullPointerException.class, () -> new WeightRecord(athlete, null, weight, null, CREATED_AT));
        assertThrows(NullPointerException.class, () -> new WeightRecord(athlete, DATE, null, null, CREATED_AT));
        assertThrows(NullPointerException.class, () -> new WeightRecord(athlete, DATE, weight, null, null));
    }

    // ---------- corrección (PUT) ----------

    @Test
    void shouldReplaceTheDataAndUpdateOnlyUpdatedAtWhenCorrected() {
        // Arrange
        WeightRecord weightRecord = new WeightRecord(athlete, DATE, new BigDecimal("72.5"), "En ayunas",
                CREATED_AT);
        Instant correctedAt = Instant.parse("2026-11-07T09:00:00Z");

        // Act
        weightRecord.correct(DATE.minusDays(1), new BigDecimal("73.1"), null, correctedAt);

        // Assert
        assertEquals(DATE.minusDays(1), weightRecord.getRecordedOn());
        assertEquals(new BigDecimal("73.10"), weightRecord.getWeightKg());
        assertNull(weightRecord.getComment());
        assertEquals(CREATED_AT, weightRecord.getCreatedAt());
        assertEquals(correctedAt, weightRecord.getUpdatedAt());
        assertSame(athlete, weightRecord.getAthlete());
    }

    @Test
    void shouldUpdateUpdatedAtEvenIfTheDataDoesNotChange() {
        WeightRecord weightRecord = withWeight("72.5");
        Instant correctedAt = CREATED_AT.plusSeconds(60);

        weightRecord.correct(DATE, new BigDecimal("72.5"), null, correctedAt);

        assertEquals(correctedAt, weightRecord.getUpdatedAt());
    }

    @Test
    void shouldValidateTheCorrectionWithTheSameRules() {
        WeightRecord weightRecord = withWeight("72.5");
        Instant correctedAt = CREATED_AT.plusSeconds(60);

        assertThrows(IllegalArgumentException.class,
                () -> weightRecord.correct(DATE, new BigDecimal("300.01"), null, correctedAt));
        assertThrows(NullPointerException.class,
                () -> weightRecord.correct(null, new BigDecimal("72.5"), null, correctedAt));
        assertThrows(NullPointerException.class,
                () -> weightRecord.correct(DATE, new BigDecimal("72.5"), null, null));
    }

    // ---------- equals / hashCode ----------

    @Test
    void shouldBeEqualOnlyWithTheSameId() {
        // Arrange
        UUID id = UUID.randomUUID();
        WeightRecord first = withWeight("72.5");
        WeightRecord sameId = withWeight("80");
        WeightRecord otherId = withWeight("72.5");
        ReflectionTestUtils.setField(first, "id", id);
        ReflectionTestUtils.setField(sameId, "id", id);
        ReflectionTestUtils.setField(otherId, "id", UUID.randomUUID());

        // Assert
        assertEquals(first, sameId);
        assertEquals(first.hashCode(), sameId.hashCode());
        assertNotEquals(first, otherId);
        // Sin id (todavía no se guardó) solo es igual a sí mismo
        assertNotEquals(withWeight("72.5"), withWeight("72.5"));
    }

    private WeightRecord withWeight(String weightKg) {
        return new WeightRecord(athlete, DATE, new BigDecimal(weightKg), null, CREATED_AT);
    }

    private WeightRecord withComment(String comment) {
        return new WeightRecord(athlete, DATE, new BigDecimal("72.5"), comment, CREATED_AT);
    }
}
