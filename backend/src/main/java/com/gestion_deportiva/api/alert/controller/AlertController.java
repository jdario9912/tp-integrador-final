package com.gestion_deportiva.api.alert.controller;

import com.gestion_deportiva.api.alert.dto.AlertResponse;
import com.gestion_deportiva.api.alert.service.AlertService;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

// Alertas del entrenador (US-47): solo COACH (SecurityConfig). Las de su cartera las filtra AlertService
@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    // Pendientes de la cartera, las críticas primero. Reevalúa las condiciones antes de responder
    @GetMapping
    public List<AlertResponse> findPending(@AuthenticationPrincipal Jwt jwt) {
        return alertService.findPending(AuthenticatedUser.from(jwt));
    }

    // Marca la alerta como atendida (guarda quién y cuándo). Ya atendida: 409
    @PatchMapping("/{alertId}/handle")
    public AlertResponse handle(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID alertId) {
        return alertService.handle(AuthenticatedUser.from(jwt), alertId);
    }
}
