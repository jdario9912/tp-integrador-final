package com.gestion_deportiva.api.alert.service;

import com.gestion_deportiva.api.alert.model.enums.AlertType;
import com.gestion_deportiva.api.alert.repository.AlertConditionRepository;
import com.gestion_deportiva.api.alert.repository.AlertRepository;
import com.gestion_deportiva.api.alert.repository.AlertTypeRule;
import com.gestion_deportiva.api.alert.repository.ComplianceRow;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.dashboard.repository.CoachDashboardRepository;
import com.gestion_deportiva.api.dashboard.repository.DashboardAthleteRow;
import com.gestion_deportiva.api.dashboard.repository.PendingReviewRow;
import com.gestion_deportiva.api.training.model.enums.SessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// US-47 · Evaluación de alertas (SVC-08): detecta las condiciones de cada atleta de una cartera y abre las alertas
// que falten. Umbrales y textos salen del catálogo alert_types. Cada atleta se escribe en su propia transacción
// (AlertWriter): si falla uno, se registra y el resto continúa. La corren el job diario (AlertScheduler) y el GET de
// las alertas del entrenador
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertEvaluator {

    // Bajo cumplimiento = finalizó menos de la mitad de lo planificado en la ventana
    static final double LOW_COMPLIANCE_RATIO = 0.5;

    private final AlertConditionRepository conditionRepository;
    private final CoachDashboardRepository dashboardRepository;
    private final AlertRepository alertRepository;
    private final AlertWriter alertWriter;
    private final AppClock appClock;

    // Todas las carteras: un entrenador que falla no corta la evaluación de los demás
    public void evaluateAll() {
        List<UUID> coachIds = conditionRepository.findActiveCoachIds();
        int failed = 0;
        for (UUID coachId : coachIds) {
            try {
                evaluateCoach(coachId);
            } catch (RuntimeException ex) {
                failed++;
                log.error("Falló la evaluación de alertas de la cartera del entrenador {}", coachId, ex);
            }
        }
        log.info("Evaluación de alertas: {} carteras, {} con error", coachIds.size(), failed);
    }

    public void evaluateCoach(UUID coachId) {
        Instant now = appClock.now();
        LocalDate today = appClock.dateOf(now);
        Map<AlertType, AlertTypeRule> rules = rules();
        Map<UUID, Map<AlertType, String>> detected = new LinkedHashMap<>();

        dashboardRepository.findAthletesWithoutRoutine(coachId, today).stream()
                .map(DashboardAthleteRow::getId)
                .forEach(id -> add(detected, id, AlertType.NO_ROUTINE, render(rules.get(AlertType.NO_ROUTINE), 0, 0)));

        for (PendingReviewRow row : dashboardRepository.findPendingReviews(coachId, SessionStatus.FINISHED.getId())) {
            add(detected, row.getId(), AlertType.PENDING_REVIEW,
                    render(rules.get(AlertType.PENDING_REVIEW), row.getPendingCount(), 0));
        }

        AlertTypeRule weightRule = rules.get(AlertType.NO_WEIGHT_LOG);
        dashboardRepository.findAthletesWithoutRecentWeight(coachId, cutoff(today, weightRule)).stream()
                .map(DashboardAthleteRow::getId)
                .forEach(id -> add(detected, id, AlertType.NO_WEIGHT_LOG, render(weightRule, 0, 0)));

        AlertTypeRule inactivityRule = rules.get(AlertType.INACTIVITY);
        conditionRepository.findInactiveAthletes(coachId, today, cutoff(today, inactivityRule),
                        SessionStatus.FINISHED.getId())
                .forEach(id -> add(detected, id, AlertType.INACTIVITY, render(inactivityRule, 0, 0)));

        AlertTypeRule complianceRule = rules.get(AlertType.LOW_COMPLIANCE);
        for (ComplianceRow row : conditionRepository.findCompliance(coachId, today, cutoff(today, complianceRule),
                SessionStatus.FINISHED.getId())) {
            long planned = plannedSessions(row.getDaysPerWeek(), complianceRule.getThresholdDays());
            if (row.getFinishedCount() < planned * LOW_COMPLIANCE_RATIO) {
                add(detected, row.getAthleteId(), AlertType.LOW_COMPLIANCE,
                        render(complianceRule, row.getFinishedCount(), planned));
            }
        }

        int opened = 0;
        for (Map.Entry<UUID, Map<AlertType, String>> entry : detected.entrySet()) {
            try {
                opened += alertWriter.openMissing(entry.getKey(), entry.getValue(), now);
            } catch (RuntimeException ex) {
                log.error("Falló la evaluación de alertas del atleta {}", entry.getKey(), ex);
            }
        }
        log.info("Alertas del entrenador {}: {} atletas con condiciones, {} alertas nuevas", coachId,
                detected.size(), opened);
    }

    // Entrenamientos esperados en la ventana según los días por semana de la rutina, redondeando hacia arriba
    static long plannedSessions(int daysPerWeek, int windowDays) {
        return (long) Math.ceil(daysPerWeek * windowDays / 7.0);
    }

    // Primer día de la ventana de "days" días que termina hoy (inclusive)
    private static LocalDate cutoff(LocalDate today, AlertTypeRule rule) {
        return today.minusDays(rule.getThresholdDays() - 1L);
    }

    static String render(AlertTypeRule rule, long count, long planned) {
        String days = rule.getThresholdDays() == null ? "" : rule.getThresholdDays().toString();
        return rule.getMessageTemplate()
                .replace("{days}", days)
                .replace("{count}", Long.toString(count))
                .replace("{planned}", Long.toString(planned));
    }

    private Map<AlertType, AlertTypeRule> rules() {
        Map<AlertType, AlertTypeRule> rules = alertRepository.findTypeRules().stream()
                .collect(Collectors.toMap(rule -> AlertType.valueOf(rule.getCode()), Function.identity(),
                        (first, second) -> first, () -> new EnumMap<>(AlertType.class)));
        if (rules.size() != AlertType.values().length) {
            throw new IllegalStateException("El catálogo alert_types no coincide con el enum AlertType");
        }
        return rules;
    }

    private static void add(Map<UUID, Map<AlertType, String>> detected, UUID athleteId, AlertType type,
                            String message) {
        detected.computeIfAbsent(athleteId, id -> new EnumMap<>(AlertType.class)).put(type, message);
    }
}
