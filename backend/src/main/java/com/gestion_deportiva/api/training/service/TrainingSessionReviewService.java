package com.gestion_deportiva.api.training.service;

import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.training.dto.ReviewTrainingSessionRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.exception.TrainingSessionNotFoundException;
import com.gestion_deportiva.api.training.model.TrainingSession;
import com.gestion_deportiva.api.training.repository.PerformedSetRepository;
import com.gestion_deportiva.api.training.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Revisión del entrenador (US-21, contrato 15.4 y 15.6). La regla de rol (solo COACH) vive en SecurityConfig; qué
// atleta puede revisar cada entrenador, AthleteAccessGuard. Orden: pertenencia (403) → sesión inexistente o de otro
// atleta (404) → no finalizada (422, en la entidad) → revisión con la hora de AppClock
@Slf4j
@Service
@RequiredArgsConstructor
public class TrainingSessionReviewService {

    private final TrainingSessionRepository trainingSessionRepository;
    private final PerformedSetRepository performedSetRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final AppClock appClock;

    // El body es opcional: sin body, la revisión queda sin observación. Revisar de nuevo reemplaza la anterior
    @Transactional
    public TrainingSessionResponse review(AuthenticatedUser user, UUID athleteId, UUID sessionId,
                                          ReviewTrainingSessionRequest request) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        TrainingSession session = trainingSessionRepository.findDetail(athleteId, sessionId)
                .orElseThrow(() -> new TrainingSessionNotFoundException(sessionId));
        String observation = request == null ? null : request.observation();
        session.review(appClock.now(), observation);
        log.info("El entrenador {} revisó la sesión {} del atleta {}", user.id(), sessionId, athleteId);
        return TrainingSessionResponse.from(session, performedSetRepository.findBySessionInOrder(sessionId));
    }
}
