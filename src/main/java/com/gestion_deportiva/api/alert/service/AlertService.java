package com.gestion_deportiva.api.alert.service;

import com.gestion_deportiva.api.alert.dto.AlertResponse;
import com.gestion_deportiva.api.alert.exception.AlertAccessDeniedException;
import com.gestion_deportiva.api.alert.exception.AlertAlreadyHandledException;
import com.gestion_deportiva.api.alert.exception.AlertNotFoundException;
import com.gestion_deportiva.api.alert.model.Alert;
import com.gestion_deportiva.api.alert.repository.AlertRepository;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// Alertas del entrenador (US-47). La regla de rol (solo COACH) vive en SecurityConfig; la pertenencia, acá: la
// alerta tiene que ser de un atleta de la cartera del entrenador del token
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    // Las más graves primero; dentro de la misma severidad, las más recientes
    static final Comparator<Alert> PENDING_ORDER = Comparator
            .comparing((Alert alert) -> alert.getSeverity().getSortOrder()).reversed()
            .thenComparing(Alert::getGeneratedAt, Comparator.reverseOrder())
            .thenComparing(Alert::getId);

    private final AlertRepository alertRepository;
    private final CoachRepository coachRepository;
    private final AlertEvaluator alertEvaluator;
    private final AppClock appClock;

    // Reevalúa la cartera antes de listar, así no hace falta esperar al job diario. Sin @Transactional: cada atleta
    // se evalúa en su propia transacción (AlertWriter) y la lectura corre después, en la del repositorio
    public List<AlertResponse> findPending(AuthenticatedUser user) {
        alertEvaluator.evaluateCoach(user.id());
        return alertRepository.findPendingByCoach(user.id()).stream()
                .sorted(PENDING_ORDER)
                .map(AlertResponse::from)
                .toList();
    }

    // Orden del contrato: inexistente (404) → atleta ajeno (403) → ya atendida (409)
    @Transactional
    public AlertResponse handle(AuthenticatedUser user, UUID alertId) {
        Alert alert = alertRepository.findByIdWithAthlete(alertId)
                .orElseThrow(() -> new AlertNotFoundException(alertId));

        // Un atleta desvinculado (sin entrenador) no es de ninguna cartera
        Coach coach = alert.getAthlete().getCoach();
        if (coach == null || !coach.getId().equals(user.id())) {
            log.warn("Acceso denegado: el entrenador {} quiso atender la alerta {}", user.id(), alertId);
            throw new AlertAccessDeniedException();
        }
        if (alert.isHandled()) {
            throw new AlertAlreadyHandledException();
        }

        alert.handle(coachRepository.getReferenceById(user.id()), appClock.now());
        // saveAndFlush: el UPDATE corre acá y los CHECK de la base fallan dentro de este método
        return AlertResponse.from(alertRepository.saveAndFlush(alert));
    }
}
