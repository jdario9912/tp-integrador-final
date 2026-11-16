package com.gestion_deportiva.api.training.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Resumen armado a partir de los números ya contados (US-21, contrato 15.3): las mismas reglas que from (14.4), para
// que el historial y el detalle muestren lo mismo
class TrainingSessionSummaryOfTest {

    @Test
    void shouldComputeThePendingSetsFromThePrescribedDoneAndSkipped() {
        TrainingSessionSummary summary = TrainingSessionSummary.of(7, 3, 1, new BigDecimal("1580"));

        assertEquals(7, summary.prescribedSets());
        assertEquals(3, summary.doneSets());
        assertEquals(1, summary.skippedSets());
        assertEquals(3, summary.pendingSets());
        assertEquals(new BigDecimal("1580.00"), summary.volumeKg());
    }

    @Test
    void shouldNeverReturnNegativePendingSets() {
        // El entrenador bajó las series después de que el atleta registrara más de las prescritas (14.4)
        TrainingSessionSummary summary = TrainingSessionSummary.of(4, 3, 3, BigDecimal.ZERO);

        assertEquals(0, summary.pendingSets());
    }

    @Test
    void shouldGiveTheVolumeTwoDecimalsRoundedHalfUp() {
        assertEquals(new BigDecimal("62.50"), TrainingSessionSummary.of(0, 0, 0, new BigDecimal("62.5")).volumeKg());
        assertEquals(new BigDecimal("1.01"), TrainingSessionSummary.of(0, 0, 0, new BigDecimal("1.005")).volumeKg());
    }

    @Test
    void shouldReportAZeroSummaryWithoutSets() {
        TrainingSessionSummary summary = TrainingSessionSummary.of(0, 0, 0, BigDecimal.ZERO);

        assertEquals(0, summary.pendingSets());
        assertEquals(new BigDecimal("0.00"), summary.volumeKg());
    }
}
