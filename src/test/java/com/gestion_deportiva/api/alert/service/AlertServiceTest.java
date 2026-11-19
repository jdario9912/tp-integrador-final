package com.gestion_deportiva.api.alert.service;

import com.gestion_deportiva.api.alert.dto.AlertResponse;
import com.gestion_deportiva.api.alert.exception.AlertAccessDeniedException;
import com.gestion_deportiva.api.alert.exception.AlertAlreadyHandledException;
import com.gestion_deportiva.api.alert.exception.AlertNotFoundException;
import com.gestion_deportiva.api.alert.model.Alert;
import com.gestion_deportiva.api.alert.model.enums.AlertSeverity;
import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.alert.repository.AlertRepository;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    private static final UUID COACH_ID = UUID.randomUUID();
    private static final UUID ALERT_ID = UUID.randomUUID();
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(COACH_ID, Role.COACH);
    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private CoachRepository coachRepository;

    @Mock
    private AlertEvaluator alertEvaluator;

    private AlertService alertService;

    private Coach coach;
    private Athlete athlete;

    @BeforeEach
    void setUp() {
        AppClock appClock = new AppClock(Clock.fixed(NOW, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        alertService = new AlertService(alertRepository, coachRepository, alertEvaluator, appClock);
        coach = coach("ana@test.com");
        ReflectionTestUtils.setField(coach, "id", COACH_ID);
        athlete = athlete("leo@test.com", coach);
        ReflectionTestUtils.setField(athlete, "id", UUID.randomUUID());
    }

    // ---------- pendientes ----------

    @Test
    void shouldEvaluateThePortfolioBeforeListing() {
        // Arrange
        when(alertRepository.findPendingByCoach(COACH_ID)).thenReturn(List.of());

        // Act
        alertService.findPending(COACH_USER);

        // Assert
        InOrder order = inOrder(alertEvaluator, alertRepository);
        order.verify(alertEvaluator).evaluateCoach(COACH_ID);
        order.verify(alertRepository).findPendingByCoach(COACH_ID);
    }

    @Test
    void shouldListTheMostSevereFirstAndThenTheNewest() {
        // Arrange
        Alert oldInfo = alert(AlertType.NO_WEIGHT_LOG, NOW.minusSeconds(300));
        Alert newInfo = alert(AlertType.PENDING_REVIEW, NOW.minusSeconds(100));
        Alert critical = alert(AlertType.INACTIVITY, NOW.minusSeconds(900));
        Alert warning = alert(AlertType.NO_ROUTINE, NOW.minusSeconds(50));
        when(alertRepository.findPendingByCoach(COACH_ID)).thenReturn(List.of(oldInfo, newInfo, critical, warning));

        // Act
        List<AlertResponse> alerts = alertService.findPending(COACH_USER);

        // Assert
        assertEquals(List.of(AlertType.INACTIVITY, AlertType.NO_ROUTINE, AlertType.PENDING_REVIEW,
                AlertType.NO_WEIGHT_LOG), alerts.stream().map(AlertResponse::type).toList());
        assertEquals(AlertSeverity.CRITICAL, alerts.get(0).severity());
        assertEquals("Leo Gil", alerts.get(0).athleteName());
    }

    // ---------- atender ----------

    @Test
    void shouldHandleTheAlertOfTheCoachPortfolio() {
        // Arrange
        Alert alert = alert(AlertType.NO_ROUTINE, NOW.minusSeconds(60));
        when(alertRepository.findByIdWithAthlete(ALERT_ID)).thenReturn(Optional.of(alert));
        when(coachRepository.getReferenceById(COACH_ID)).thenReturn(coach);
        when(alertRepository.saveAndFlush(alert)).thenReturn(alert);

        // Act
        AlertResponse response = alertService.handle(COACH_USER, ALERT_ID);

        // Assert
        assertEquals(NOW, response.handledAt());
        assertEquals(coach, alert.getHandledBy());
    }

    @Test
    void shouldReturn404WhenTheAlertDoesNotExist() {
        // Arrange
        when(alertRepository.findByIdWithAthlete(ALERT_ID)).thenReturn(Optional.empty());

        // Act + Assert
        assertThrows(AlertNotFoundException.class, () -> alertService.handle(COACH_USER, ALERT_ID));
    }

    @Test
    void shouldReturn403WhenTheAthleteBelongsToAnotherCoach() {
        // Arrange
        Coach other = coach("otra@test.com");
        ReflectionTestUtils.setField(other, "id", UUID.randomUUID());
        Athlete foreign = athlete("mia@test.com", other);
        Alert alert = new Alert(foreign, AlertType.NO_ROUTINE, "Sin rutina", NOW.minusSeconds(60));
        when(alertRepository.findByIdWithAthlete(ALERT_ID)).thenReturn(Optional.of(alert));

        // Act + Assert
        assertThrows(AlertAccessDeniedException.class, () -> alertService.handle(COACH_USER, ALERT_ID));
        verify(alertRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldReturn403WhenTheAthleteWasUnlinked() {
        // Arrange
        Athlete unlinked = athlete("mia@test.com", null);
        Alert alert = new Alert(unlinked, AlertType.NO_ROUTINE, "Sin rutina", NOW.minusSeconds(60));
        when(alertRepository.findByIdWithAthlete(ALERT_ID)).thenReturn(Optional.of(alert));

        // Act + Assert
        assertThrows(AlertAccessDeniedException.class, () -> alertService.handle(COACH_USER, ALERT_ID));
    }

    @Test
    void shouldReturn409WhenTheAlertWasAlreadyHandled() {
        // Arrange
        Alert alert = alert(AlertType.NO_ROUTINE, NOW.minusSeconds(60));
        alert.handle(coach, NOW.minusSeconds(30));
        when(alertRepository.findByIdWithAthlete(ALERT_ID)).thenReturn(Optional.of(alert));

        // Act + Assert
        assertThrows(AlertAlreadyHandledException.class, () -> alertService.handle(COACH_USER, ALERT_ID));
        assertEquals(NOW.minusSeconds(30), alert.getHandledAt());
    }

    private Alert alert(AlertType type, Instant generatedAt) {
        Alert alert = new Alert(athlete, type, "Mensaje de " + type, generatedAt);
        ReflectionTestUtils.setField(alert, "id", UUID.randomUUID());
        return alert;
    }
}
