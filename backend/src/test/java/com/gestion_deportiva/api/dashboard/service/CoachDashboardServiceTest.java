package com.gestion_deportiva.api.dashboard.service;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.dashboard.dto.CoachDashboardResponse;
import com.gestion_deportiva.api.dashboard.dto.DashboardAthlete;
import com.gestion_deportiva.api.dashboard.dto.PendingReviewAthlete;
import com.gestion_deportiva.api.dashboard.dto.WeightGapAthlete;
import com.gestion_deportiva.api.dashboard.repository.CoachDashboardRepository;
import com.gestion_deportiva.api.dashboard.repository.DashboardAthleteRow;
import com.gestion_deportiva.api.dashboard.repository.PendingReviewRow;
import com.gestion_deportiva.api.dashboard.repository.WeightGapRow;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

// US-11 · Dashboard del entrenador: arma las cuatro métricas de la cartera del token con el "hoy" de la app y, si una
// falla en la base, devuelve el resto con su aviso. Mockito: el repositorio es un mock
@ExtendWith(MockitoExtension.class)
class CoachDashboardServiceTest {

    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
    // 01:00 UTC del 18 es todavía el 17 en Argentina: el "hoy" tiene que salir de la zona de la app
    private static final Instant NOW = Instant.parse("2026-11-18T01:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);

    private static final Row LEO = new Row(UUID.randomUUID(), "Leo", "Gil", null, null);
    private static final Row MIA = new Row(UUID.randomUUID(), "Mía", "Sosa", null, null);

    @Mock
    private CoachDashboardRepository coachDashboardRepository;

    private CoachDashboardService service;

    @BeforeEach
    void setUp() {
        AppClock appClock = new AppClock(Clock.fixed(NOW, ZoneOffset.UTC),
                new TimeZoneProperties(TimeZoneProperties.DEFAULT_TIME_ZONE));
        service = new CoachDashboardService(coachDashboardRepository, appClock);
    }

    @Test
    void shouldBuildTheFourMetricsOfTheCoachPortfolio() {
        // Arrange
        UUID coachId = COACH_USER.id();
        when(coachDashboardRepository.findActiveAthletes(coachId)).thenReturn(List.of(LEO, MIA));
        when(coachDashboardRepository.findAthletesWithoutRoutine(coachId, TODAY)).thenReturn(List.of(MIA));
        when(coachDashboardRepository.findPendingReviews(coachId, SessionStatus.FINISHED.getId()))
                .thenReturn(List.of(LEO.withPending(2L), MIA.withPending(1L)));
        when(coachDashboardRepository.findAthletesWithoutRecentWeight(coachId, TODAY.minusDays(6)))
                .thenReturn(List.of(LEO.withLastRecordedOn(TODAY.minusDays(9)), MIA));

        // Act
        CoachDashboardResponse dashboard = service.getDashboard(COACH_USER);

        // Assert
        assertEquals(2, dashboard.activeAthletes().count());
        assertEquals(new DashboardAthlete(LEO.id(), "Leo", "Gil"), dashboard.activeAthletes().athletes().get(0));
        assertEquals(1, dashboard.withoutRoutine().count());
        assertEquals(MIA.id(), dashboard.withoutRoutine().athletes().get(0).id());
        // El total de pendientes son las sesiones (2 + 1), no los atletas
        assertEquals(3, dashboard.pendingReviewSessions().count());
        assertEquals(new PendingReviewAthlete(LEO.id(), "Leo", "Gil", 2),
                dashboard.pendingReviewSessions().athletes().get(0));
        assertEquals(2, dashboard.withoutRecentWeight().count());
        assertEquals(new WeightGapAthlete(LEO.id(), "Leo", "Gil", TODAY.minusDays(9)),
                dashboard.withoutRecentWeight().athletes().get(0));
        assertNull(dashboard.withoutRecentWeight().athletes().get(1).lastRecordedOn());
        assertTrue(dashboard.warnings().isEmpty());
    }

    @Test
    void shouldReturnZeroMetricsWithEmptyListsForACoachWithoutAthletes() {
        CoachDashboardResponse dashboard = service.getDashboard(COACH_USER);

        assertEquals(0, dashboard.activeAthletes().count());
        assertTrue(dashboard.activeAthletes().athletes().isEmpty());
        assertEquals(0, dashboard.withoutRoutine().count());
        assertEquals(0, dashboard.pendingReviewSessions().count());
        assertEquals(0, dashboard.withoutRecentWeight().count());
        assertTrue(dashboard.warnings().isEmpty());
    }

    @Test
    void shouldReturnTheOtherMetricsWithAWarningWhenOneFails() {
        // Arrange: falla la de pesos; las demás responden
        UUID coachId = COACH_USER.id();
        when(coachDashboardRepository.findActiveAthletes(coachId)).thenReturn(List.of(LEO));
        when(coachDashboardRepository.findAthletesWithoutRecentWeight(coachId, TODAY.minusDays(6)))
                .thenThrow(new DataAccessResourceFailureException("timeout"));

        // Act
        CoachDashboardResponse dashboard = service.getDashboard(COACH_USER);

        // Assert
        assertEquals(1, dashboard.activeAthletes().count());
        assertEquals(0, dashboard.withoutRoutine().count());
        assertEquals(0, dashboard.pendingReviewSessions().count());
        assertNull(dashboard.withoutRecentWeight());
        assertEquals(List.of("withoutRecentWeight"), dashboard.warnings());
    }

    @Test
    void shouldListEveryFailedMetricInTheWarningsInResponseOrder() {
        UUID coachId = COACH_USER.id();
        when(coachDashboardRepository.findActiveAthletes(coachId))
                .thenThrow(new DataAccessResourceFailureException("timeout"));
        when(coachDashboardRepository.findPendingReviews(coachId, SessionStatus.FINISHED.getId()))
                .thenThrow(new DataAccessResourceFailureException("timeout"));

        CoachDashboardResponse dashboard = service.getDashboard(COACH_USER);

        assertNull(dashboard.activeAthletes());
        assertNull(dashboard.pendingReviewSessions());
        assertEquals(0, dashboard.withoutRoutine().count());
        assertEquals(List.of("activeAthletes", "pendingReviewSessions"), dashboard.warnings());
    }

    // Fila de prueba que sirve para las tres proyecciones
    private record Row(UUID id, String firstName, String lastName, Long pendingCount, LocalDate lastRecordedOn)
            implements DashboardAthleteRow, PendingReviewRow, WeightGapRow {

        Row withPending(Long count) {
            return new Row(id, firstName, lastName, count, lastRecordedOn);
        }

        Row withLastRecordedOn(LocalDate date) {
            return new Row(id, firstName, lastName, pendingCount, date);
        }

        @Override
        public UUID getId() {
            return id;
        }

        @Override
        public String getFirstName() {
            return firstName;
        }

        @Override
        public String getLastName() {
            return lastName;
        }

        @Override
        public Long getPendingCount() {
            return pendingCount;
        }

        @Override
        public LocalDate getLastRecordedOn() {
            return lastRecordedOn;
        }
    }
}
