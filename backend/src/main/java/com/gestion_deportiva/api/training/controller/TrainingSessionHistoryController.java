package com.gestion_deportiva.api.training.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.training.dto.TrainingSessionHistoryFilter;
import com.gestion_deportiva.api.training.dto.TrainingSessionHistoryItem;
import com.gestion_deportiva.api.training.service.TrainingSessionHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// Historial de sesiones cerradas (US-21, contrato 15.2). Lo leen los dos roles (reglas en SecurityConfig); la
// pertenencia la controla TrainingSessionHistoryService. Cuelga de la misma ruta que el alta de sesiones (US-18)
@RestController
@RequestMapping("/athletes/{athleteId}/sessions")
@RequiredArgsConstructor
public class TrainingSessionHistoryController {

    private final TrainingSessionHistoryService trainingSessionHistoryService;

    // Del más reciente al más antiguo. ?from y ?to (YYYY-MM-DD, inclusivos) son opcionales; ?page (desde 0) y ?size
    // (por defecto 20, máximo 100). Solo sesiones FINISHED y CANCELLED. @ParameterObject: Swagger documenta cada
    // query param por separado
    @GetMapping
    public PageResponse<TrainingSessionHistoryItem> findHistory(@AuthenticationPrincipal Jwt jwt,
                                                                @PathVariable UUID athleteId,
                                                                @ParameterObject @Valid
                                                                TrainingSessionHistoryFilter filter,
                                                                @ParameterObject @PageableDefault(size = 20)
                                                                Pageable pageable) {
        return trainingSessionHistoryService.findHistory(AuthenticatedUser.from(jwt), athleteId, filter, pageable);
    }
}
