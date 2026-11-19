package com.gestion_deportiva.api.alert.service;

import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.alert.repository.AlertConditionRepository;
import com.gestion_deportiva.api.alert.repository.AlertRepository;
import com.gestion_deportiva.api.alert.repository.AlertTypeRule;
import com.gestion_deportiva.api.alert.repository.ComplianceRow;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.dashboard.repository.CoachDashboardRepository;
import com.gestion_deportiva.api.dashboard.repository.DashboardAthleteRow;
import com.gestion_deportiva.api.dashboard.repository.PendingReviewRow;
import com.gestion_deportiva.api.dashboard.repository.WeightGapRow;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertEvaluatorTest {

    private static final UUID COACH_ID = UUID.randomUUID();
    private static final UUID LEO = UUID.randomUUID();
    private static final UUID MIA = UUID.randomUUID();
    // 12:00 UTC = 09:00 en Argentina: "hoy" es el 10/11 en las dos zonas
    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 10);
    private static final short FINISHED = SessionStatus.FINISHED.getId();

    // Mismos umbrales y textos que alert_types en la V18
    private static final List<AlertTypeRule> RULES = List.of(
            rule("INACTIVITY", 14, "No finalizó ningún entrenamiento en los últimos {days} días"),
            rule("NO_ROUTINE", null, "No tiene una rutina asignada y vigente"),
            rule("LOW_COMPLIANCE", 7, "Finalizó {count} de {planned} entrenamientos planificados en los últimos {days} días"),
            rule("NO_WEIGHT_LOG", 7, "No registró su peso en los últimos {days} días"),
            rule("PENDING_REVIEW", null, "Tiene {count} sesiones finalizadas sin revisar"));

    @Mock
    private AlertConditionRepository conditionRepository;

    @Mock
    private CoachDashboardRepository dashboardRepository;

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertWriter alertWriter;

    private AlertEvaluator evaluator;

    // Las consultas sin stub devuelven una lista vacía (Mockito): solo se stubbean las condiciones de cada test
    @BeforeEach
    void setUp() {
        AppClock appClock = new AppClock(Clock.fixed(NOW, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        evaluator = new AlertEvaluator(conditionRepository, dashboardRepository, alertRepository, alertWriter,
                appClock);
    }

    @Test
    void shouldDetectEveryConditionWithItsMessage() {
        // Arrange: Leo sin rutina, con 2 sesiones sin revisar y sin peso; Mia inactiva y con bajo cumplimiento
        stubRules();
        when(dashboardRepository.findAthletesWithoutRoutine(COACH_ID, TODAY)).thenReturn(List.of(athleteRow(LEO)));
        when(dashboardRepository.findPendingReviews(COACH_ID, FINISHED)).thenReturn(List.of(pendingRow(LEO, 2)));
        when(dashboardRepository.findAthletesWithoutRecentWeight(COACH_ID, TODAY.minusDays(6)))
                .thenReturn(List.of(weightRow(LEO)));
        when(conditionRepository.findInactiveAthletes(COACH_ID, TODAY, TODAY.minusDays(13), FINISHED))
                .thenReturn(List.of(MIA));
        when(conditionRepository.findCompliance(COACH_ID, TODAY, TODAY.minusDays(6), FINISHED))
                .thenReturn(List.of(compliance(MIA, 4, 1)));

        // Act
        evaluator.evaluateCoach(COACH_ID);

        // Assert
        ArgumentCaptor<Map<AlertType, String>> leo = captor();
        verify(alertWriter).openMissing(eq(LEO), leo.capture(), eq(NOW));
        assertEquals(Map.of(
                AlertType.NO_ROUTINE, "No tiene una rutina asignada y vigente",
                AlertType.PENDING_REVIEW, "Tiene 2 sesiones finalizadas sin revisar",
                AlertType.NO_WEIGHT_LOG, "No registró su peso en los últimos 7 días"), leo.getValue());

        ArgumentCaptor<Map<AlertType, String>> mia = captor();
        verify(alertWriter).openMissing(eq(MIA), mia.capture(), eq(NOW));
        assertEquals(Map.of(
                AlertType.INACTIVITY, "No finalizó ningún entrenamiento en los últimos 14 días",
                AlertType.LOW_COMPLIANCE, "Finalizó 1 de 4 entrenamientos planificados en los últimos 7 días"),
                mia.getValue());
    }

    @Test
    void shouldNotFlagComplianceAtHalfThePlannedSessions() {
        // Arrange: 4 planificadas, 2 finalizadas = 50 %: no es bajo
        stubRules();
        when(conditionRepository.findCompliance(COACH_ID, TODAY, TODAY.minusDays(6), FINISHED))
                .thenReturn(List.of(compliance(MIA, 4, 2)));

        // Act
        evaluator.evaluateCoach(COACH_ID);

        // Assert
        verify(alertWriter, never()).openMissing(any(), anyMap(), any());
    }

    @Test
    void shouldContinueWithTheOtherAthletesWhenOneFails() {
        // Arrange
        stubRules();
        when(dashboardRepository.findAthletesWithoutRoutine(COACH_ID, TODAY))
                .thenReturn(List.of(athleteRow(LEO), athleteRow(MIA)));
        doThrow(new IllegalStateException("falla de la base")).when(alertWriter)
                .openMissing(eq(LEO), anyMap(), eq(NOW));

        // Act
        evaluator.evaluateCoach(COACH_ID);

        // Assert
        verify(alertWriter).openMissing(eq(MIA), anyMap(), eq(NOW));
    }

    @Test
    void shouldContinueWithTheOtherCoachesWhenOneFails() {
        // Arrange: la primera cartera falla al leer el catálogo; la segunda no tiene condiciones
        UUID otherCoach = UUID.randomUUID();
        when(conditionRepository.findActiveCoachIds()).thenReturn(List.of(COACH_ID, otherCoach));
        when(alertRepository.findTypeRules())
                .thenThrow(new IllegalStateException("falla de la base"))
                .thenReturn(RULES);

        // Act
        evaluator.evaluateAll();

        // Assert
        verify(dashboardRepository).findAthletesWithoutRoutine(otherCoach, TODAY);
    }

    @Test
    void shouldFailWhenTheCatalogDoesNotMatchTheEnum() {
        // Arrange
        when(alertRepository.findTypeRules()).thenReturn(RULES.subList(0, 4));

        // Act + Assert
        assertThrows(IllegalStateException.class, () -> evaluator.evaluateCoach(COACH_ID));
    }

    @Test
    void shouldRoundPlannedSessionsUp() {
        assertEquals(3, AlertEvaluator.plannedSessions(3, 7));
        assertEquals(2, AlertEvaluator.plannedSessions(1, 14));
        assertEquals(1, AlertEvaluator.plannedSessions(1, 3));
    }

    // ---------- helpers ----------

    private void stubRules() {
        when(alertRepository.findTypeRules()).thenReturn(RULES);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<Map<AlertType, String>> captor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
    }

    private static AlertTypeRule rule(String code, Integer days, String template) {
        return new AlertTypeRule() {
            public String getCode() { return code; }
            public Short getThresholdDays() { return days == null ? null : days.shortValue(); }
            public String getMessageTemplate() { return template; }
        };
    }

    private static DashboardAthleteRow athleteRow(UUID id) {
        return new DashboardAthleteRow() {
            public UUID getId() { return id; }
            public String getFirstName() { return "Leo"; }
            public String getLastName() { return "Gil"; }
        };
    }

    private static WeightGapRow weightRow(UUID id) {
        return new WeightGapRow() {
            public UUID getId() { return id; }
            public String getFirstName() { return "Leo"; }
            public String getLastName() { return "Gil"; }
            public LocalDate getLastRecordedOn() { return null; }
        };
    }

    private static PendingReviewRow pendingRow(UUID id, long count) {
        return new PendingReviewRow() {
            public UUID getId() { return id; }
            public String getFirstName() { return "Leo"; }
            public String getLastName() { return "Gil"; }
            public Long getPendingCount() { return count; }
        };
    }

    private static ComplianceRow compliance(UUID id, int daysPerWeek, long finished) {
        return new ComplianceRow() {
            public UUID getAthleteId() { return id; }
            public Short getDaysPerWeek() { return (short) daysPerWeek; }
            public Long getFinishedCount() { return finished; }
        };
    }
}
