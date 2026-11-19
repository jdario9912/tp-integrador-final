package com.gestion_deportiva.api.alert.model;

import com.gestion_deportiva.api.alert.model.enums.AlertSeverity;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlertTest {

    private static final Instant GENERATED_AT = Instant.parse("2026-11-10T06:00:00Z");

    private Coach coach;
    private Athlete athlete;

    @BeforeEach
    void setUp() {
        coach = coach("ana@test.com");
        athlete = athlete("leo@test.com", coach);
    }

    @Test
    void shouldStartPendingWithTheSeverityOfItsType() {
        // Act
        Alert alert = new Alert(athlete, AlertType.INACTIVITY, "  Sin entrenar  ", GENERATED_AT);

        // Assert
        assertFalse(alert.isHandled());
        assertNull(alert.getHandledAt());
        assertNull(alert.getHandledBy());
        assertEquals("Sin entrenar", alert.getMessage());
        assertEquals(AlertSeverity.CRITICAL, alert.getSeverity());
    }

    @Test
    void shouldRecordWhoHandledItAndWhen() {
        // Arrange
        Alert alert = new Alert(athlete, AlertType.NO_ROUTINE, "Sin rutina", GENERATED_AT);
        Instant handledAt = GENERATED_AT.plusSeconds(3600);

        // Act
        alert.handle(coach, handledAt);

        // Assert
        assertTrue(alert.isHandled());
        assertEquals(handledAt, alert.getHandledAt());
        assertSame(coach, alert.getHandledBy());
    }

    @Test
    void shouldNotHandleItTwice() {
        // Arrange
        Alert alert = new Alert(athlete, AlertType.NO_ROUTINE, "Sin rutina", GENERATED_AT);
        alert.handle(coach, GENERATED_AT);

        // Act + Assert
        assertThrows(IllegalStateException.class, () -> alert.handle(coach, GENERATED_AT.plusSeconds(1)));
    }

    @Test
    void shouldNotHandleItBeforeItWasGenerated() {
        // Arrange
        Alert alert = new Alert(athlete, AlertType.NO_ROUTINE, "Sin rutina", GENERATED_AT);

        // Act + Assert
        assertThrows(IllegalArgumentException.class, () -> alert.handle(coach, GENERATED_AT.minusSeconds(1)));
        assertFalse(alert.isHandled());
    }

    @Test
    void shouldRejectABlankOrTooLongMessage() {
        assertThrows(IllegalArgumentException.class,
                () -> new Alert(athlete, AlertType.NO_ROUTINE, "  ", GENERATED_AT));
        assertThrows(IllegalArgumentException.class, () -> new Alert(athlete, AlertType.NO_ROUTINE,
                "m".repeat(Alert.MAX_MESSAGE_LENGTH + 1), GENERATED_AT));
    }

    @Test
    void shouldGradeEveryTypeAsTheCatalogDoes() {
        // Mismas severidades que alert_types en la V18
        assertEquals(AlertSeverity.CRITICAL, AlertType.INACTIVITY.getSeverity());
        assertEquals(AlertSeverity.WARNING, AlertType.NO_ROUTINE.getSeverity());
        assertEquals(AlertSeverity.WARNING, AlertType.LOW_COMPLIANCE.getSeverity());
        assertEquals(AlertSeverity.INFO, AlertType.NO_WEIGHT_LOG.getSeverity());
        assertEquals(AlertSeverity.INFO, AlertType.PENDING_REVIEW.getSeverity());
    }
}
