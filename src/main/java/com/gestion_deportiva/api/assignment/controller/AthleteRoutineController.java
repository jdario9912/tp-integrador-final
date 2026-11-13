package com.gestion_deportiva.api.assignment.controller;

import com.gestion_deportiva.api.assignment.dto.AthleteRoutineResponse;
import com.gestion_deportiva.api.assignment.service.AthleteRoutineService;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// Rutina activa del atleta (US-17): la ven el propio atleta y su entrenador (regla en SecurityConfig); la
// pertenencia la controla AthleteRoutineService con AthleteAccessGuard
@RestController
@RequestMapping("/athletes/{athleteId}/routine")
@RequiredArgsConstructor
public class AthleteRoutineController {

    private final AthleteRoutineService athleteRoutineService;

    // 200 con la rutina (también si está vencida: expired = true) o 204 sin body si no tiene una rutina activa.
    // El 204 no es un error: el frontend lo distingue del 404 (atleta inexistente) por el status
    @GetMapping
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rutina activa del atleta, vigente o vencida"),
            @ApiResponse(responseCode = "204", description = "El atleta no tiene una rutina activa",
                    content = @Content)
    })
    public ResponseEntity<AthleteRoutineResponse> findActive(@AuthenticationPrincipal Jwt jwt,
                                                             @PathVariable UUID athleteId) {
        return athleteRoutineService.findActive(AuthenticatedUser.from(jwt), athleteId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
