package com.gestion_deportiva.api.dashboard.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.dashboard.dto.CoachDashboardResponse;
import com.gestion_deportiva.api.dashboard.service.CoachDashboardService;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Dashboard del entrenador (US-11): solo COACH (regla en SecurityConfig); la cartera es la del entrenador del token
@RestController
@RequestMapping("/coaches/me/dashboard")
@RequiredArgsConstructor
public class CoachDashboardController {

    private final CoachDashboardService coachDashboardService;

    // 200 aunque falle una métrica: va en null y su nombre en warnings. Sin atletas, todo en 0 con listas vacías
    @GetMapping
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Métricas de la cartera del entrenador"),
            @ApiResponse(responseCode = "403", description = "Solo los entrenadores tienen dashboard de cartera")
    })
    public CoachDashboardResponse getDashboard(@AuthenticationPrincipal Jwt jwt) {
        return coachDashboardService.getDashboard(AuthenticatedUser.from(jwt));
    }
}
