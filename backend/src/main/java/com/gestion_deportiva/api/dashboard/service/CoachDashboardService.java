package com.gestion_deportiva.api.dashboard.service;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.dashboard.dto.CoachDashboardResponse;
import com.gestion_deportiva.api.dashboard.dto.DashboardAthlete;
import com.gestion_deportiva.api.dashboard.dto.DashboardMetric;
import com.gestion_deportiva.api.dashboard.dto.PendingReviewAthlete;
import com.gestion_deportiva.api.dashboard.dto.WeightGapAthlete;
import com.gestion_deportiva.api.dashboard.repository.CoachDashboardRepository;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

// US-11 · Dashboard del entrenador. La regla de rol (solo COACH) vive en SecurityConfig y la cartera es la del token,
// así que no hace falta AthleteAccessGuard. Si una métrica falla en la base, va en null con su aviso y el resto se
// muestra igual. Sin @Transactional a propósito: en PostgreSQL una consulta fallida aborta la transacción y las
// métricas siguientes también fallarían; así cada consulta corre por su cuenta
@Slf4j
@Service
@RequiredArgsConstructor
public class CoachDashboardService {

    // Un peso es reciente si se registró en los últimos 7 días, hoy incluido
    static final int RECENT_WEIGHT_DAYS = 7;

    static final String ACTIVE_ATHLETES = "activeAthletes";
    static final String WITHOUT_ROUTINE = "withoutRoutine";
    static final String PENDING_REVIEW_SESSIONS = "pendingReviewSessions";
    static final String WITHOUT_RECENT_WEIGHT = "withoutRecentWeight";

    private final CoachDashboardRepository coachDashboardRepository;
    private final AppClock appClock;

    public CoachDashboardResponse getDashboard(AuthenticatedUser user) {
        UUID coachId = user.id();
        LocalDate today = appClock.today();
        List<String> warnings = new ArrayList<>();

        DashboardMetric<DashboardAthlete> activeAthletes = metric(ACTIVE_ATHLETES, coachId, warnings,
                () -> DashboardMetric.of(coachDashboardRepository.findActiveAthletes(coachId).stream()
                        .map(DashboardAthlete::from).toList()));
        DashboardMetric<DashboardAthlete> withoutRoutine = metric(WITHOUT_ROUTINE, coachId, warnings,
                () -> DashboardMetric.of(coachDashboardRepository.findAthletesWithoutRoutine(coachId, today).stream()
                        .map(DashboardAthlete::from).toList()));
        DashboardMetric<PendingReviewAthlete> pendingReviewSessions = metric(PENDING_REVIEW_SESSIONS, coachId,
                warnings, () -> pendingReviews(coachId));
        DashboardMetric<WeightGapAthlete> withoutRecentWeight = metric(WITHOUT_RECENT_WEIGHT, coachId, warnings,
                () -> DashboardMetric.of(coachDashboardRepository
                        .findAthletesWithoutRecentWeight(coachId, today.minusDays(RECENT_WEIGHT_DAYS - 1)).stream()
                        .map(WeightGapAthlete::from).toList()));

        return new CoachDashboardResponse(activeAthletes, withoutRoutine, pendingReviewSessions, withoutRecentWeight,
                List.copyOf(warnings));
    }

    // El total de esta métrica son las sesiones, no los atletas
    private DashboardMetric<PendingReviewAthlete> pendingReviews(UUID coachId) {
        List<PendingReviewAthlete> athletes = coachDashboardRepository
                .findPendingReviews(coachId, SessionStatus.FINISHED.getId()).stream()
                .map(PendingReviewAthlete::from).toList();
        long sessions = athletes.stream().mapToLong(PendingReviewAthlete::pendingCount).sum();
        return new DashboardMetric<>(sessions, athletes);
    }

    private <T> DashboardMetric<T> metric(String name, UUID coachId, List<String> warnings,
                                          Supplier<DashboardMetric<T>> query) {
        try {
            return query.get();
        } catch (DataAccessException e) {
            log.error("No se pudo calcular la métrica {} del dashboard del entrenador {}", name, coachId, e);
            warnings.add(name);
            return null;
        }
    }
}
