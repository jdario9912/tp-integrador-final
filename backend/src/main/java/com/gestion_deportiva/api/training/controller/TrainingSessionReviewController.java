package com.gestion_deportiva.api.training.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.training.dto.ReviewTrainingSessionRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.service.TrainingSessionReviewService;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// Revisión del entrenador (US-21, contrato 15.4): solo COACH (regla en SecurityConfig); que sea el entrenador del
// atleta lo controla TrainingSessionReviewService
@RestController
@RequestMapping("/athletes/{athleteId}/sessions/{sessionId}/review")
@RequiredArgsConstructor
public class TrainingSessionReviewController {

    private final TrainingSessionReviewService trainingSessionReviewService;

    // 200 con la sesión y su revisión. Sin body o con observation vacía, la revisión queda sin texto. 422 si la sesión
    // no está finalizada. Revisar de nuevo reemplaza la observación
    @PutMapping
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sesión revisada, con su observación"),
            @ApiResponse(responseCode = "400", description = "La observación supera los 1000 caracteres"),
            @ApiResponse(responseCode = "403", description = "Solo el entrenador del atleta puede revisar la sesión"),
            @ApiResponse(responseCode = "404", description = "La sesión no existe o es de otro atleta"),
            @ApiResponse(responseCode = "422", description = "La sesión no está finalizada")
    })
    public TrainingSessionResponse review(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                          @PathVariable UUID sessionId,
                                          @Valid @RequestBody(required = false) ReviewTrainingSessionRequest request) {
        return trainingSessionReviewService.review(AuthenticatedUser.from(jwt), athleteId, sessionId, request);
    }
}
