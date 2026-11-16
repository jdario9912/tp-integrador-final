package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.training.dto.TrainingSessionHistoryFilter;
import com.gestion_deportiva.api.training.dto.TrainingSessionHistoryItem;
import com.gestion_deportiva.api.training.dto.TrainingSessionSummary;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.model.enums.SetStatus;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static java.util.function.Function.identity;
import static java.util.stream.Collectors.toMap;

// Historial de sesiones cerradas (US-21, contrato 15.2 y 15.6). Los dos roles lo leen (reglas en SecurityConfig); qué
// atleta puede ver cada uno, AthleteAccessGuard, antes de cualquier consulta. La página se arma con consultas fijas,
// sin N+1: la página de sesiones, sus rutinas y días (fetch de ManyToOne) y el resumen de todas en una sola consulta
@Service
@RequiredArgsConstructor
public class TrainingSessionHistoryService {

    private final TrainingSessionRepository trainingSessionRepository;
    private final AthleteAccessGuard athleteAccessGuard;

    @Transactional(readOnly = true)
    public PageResponse<TrainingSessionHistoryItem> findHistory(AuthenticatedUser user, UUID athleteId,
                                                                TrainingSessionHistoryFilter filter, Pageable pageable) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        Page<TrainingSession> page = trainingSessionRepository.findHistory(athleteId, filter.from(), filter.to(),
                pageable);

        // Una página vacía no dispara ninguna consulta más
        List<UUID> sessionIds = page.getContent().stream().map(TrainingSession::getId).toList();
        Map<UUID, TrainingSession> withDetails = sessionIds.isEmpty() ? Map.of()
                : trainingSessionRepository.findHistoryDetails(sessionIds).stream()
                        .collect(toMap(TrainingSession::getId, identity()));
        Map<UUID, TrainingSessionSummary> summaries = sessionIds.isEmpty() ? Map.of() : summariesOf(sessionIds);

        return PageResponse.from(page.map(session -> TrainingSessionHistoryItem.from(
                withDetails.get(session.getId()), summaries.get(session.getId()))));
    }

    // Una fila por sesión de la página (la consulta parte de training_sessions, así que ninguna sesión falta)
    private Map<UUID, TrainingSessionSummary> summariesOf(List<UUID> sessionIds) {
        Map<UUID, TrainingSessionSummary> summaries = new HashMap<>();
        for (Object[] row : trainingSessionRepository.findSummaryRows(sessionIds, SetStatus.DONE.getId(),
                SetStatus.SKIPPED.getId())) {
            summaries.put(UUID.fromString(row[0].toString()), TrainingSessionSummary.of(
                    ((Number) row[1]).intValue(),
                    ((Number) row[2]).intValue(),
                    ((Number) row[3]).intValue(),
                    new BigDecimal(row[4].toString())));
        }
        return summaries;
    }
}
