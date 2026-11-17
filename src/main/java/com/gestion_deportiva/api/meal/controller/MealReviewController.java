package com.gestion_deportiva.api.meal.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.meal.dto.MealResponse;
import com.gestion_deportiva.api.meal.dto.ReviewMealRequest;
import com.gestion_deportiva.api.meal.service.MealReviewService;
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

// Revisión del entrenador sobre una comida (US-25): solo COACH (regla en SecurityConfig); que sea el entrenador del
// atleta lo controla MealReviewService
@RestController
@RequestMapping("/athletes/{athleteId}/meals/{mealId}/review")
@RequiredArgsConstructor
public class MealReviewController {

    private final MealReviewService mealReviewService;

    // 200 con la comida y su revisión. Sin body o con observation vacía, la revisión queda sin texto. Revisar de nuevo
    // reemplaza el comentario
    @PutMapping
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Comida revisada, con su comentario"),
            @ApiResponse(responseCode = "400", description = "El comentario supera los 1000 caracteres"),
            @ApiResponse(responseCode = "403", description = "Solo el entrenador del atleta puede revisar la comida"),
            @ApiResponse(responseCode = "404", description = "La comida no existe o es de otro atleta")
    })
    public MealResponse review(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                               @PathVariable UUID mealId,
                               @Valid @RequestBody(required = false) ReviewMealRequest request) {
        return mealReviewService.review(AuthenticatedUser.from(jwt), athleteId, mealId, request);
    }
}
