package com.gestion_deportiva.api.training.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.training.dto.StartTrainingSessionRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.service.TrainingSessionService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

// Sesiones de entrenamiento del atleta (US-18): solo él inicia las suyas y la sesión en progreso y el detalle los
// leen él y su entrenador (reglas en SecurityConfig); la pertenencia la controla TrainingSessionService
@RestController
@RequestMapping("/athletes/{athleteId}/sessions")
@RequiredArgsConstructor
public class TrainingSessionController {

    private final TrainingSessionService trainingSessionService;

    // 201 con la sesión y Location al detalle. 409 si ya hay una en progreso: el cliente la pide y ofrece retomarla.
    // @ResponseStatus documenta el 201 en Swagger
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<TrainingSessionResponse> start(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable UUID athleteId,
                                                         @Valid @RequestBody StartTrainingSessionRequest request) {
        TrainingSessionResponse response = trainingSessionService.start(AuthenticatedUser.from(jwt), athleteId,
                request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{sessionId}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    // 200 con la sesión en progreso o 204 sin body si no tiene ninguna (no es un error). Segmento fijo: Spring MVC lo
    // prefiere sobre /{sessionId}
    @GetMapping("/in-progress")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sesión de entrenamiento en progreso del atleta"),
            @ApiResponse(responseCode = "204", description = "El atleta no tiene una sesión en progreso",
                    content = @Content)
    })
    public ResponseEntity<TrainingSessionResponse> findInProgress(@AuthenticationPrincipal Jwt jwt,
                                                                  @PathVariable UUID athleteId) {
        return trainingSessionService.findInProgress(AuthenticatedUser.from(jwt), athleteId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{sessionId}")
    public TrainingSessionResponse findById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                            @PathVariable UUID sessionId) {
        return trainingSessionService.findById(AuthenticatedUser.from(jwt), athleteId, sessionId);
    }

    // US-20 · Finaliza la sesión en progreso (contrato 14.6): 200 con la sesión cerrada (FINISHED, endedAt y summary).
    // Sin body: la hora de fin la pone el backend. 409 si ya estaba finalizada o cancelada
    @PostMapping("/{sessionId}/finish")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sesión finalizada con su resumen"),
            @ApiResponse(responseCode = "403", description = "Solo el atleta dueño puede finalizar la sesión"),
            @ApiResponse(responseCode = "404", description = "La sesión no existe o es de otro atleta"),
            @ApiResponse(responseCode = "409", description = "La sesión ya está finalizada o cancelada")
    })
    public TrainingSessionResponse finish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                          @PathVariable UUID sessionId) {
        return trainingSessionService.finish(AuthenticatedUser.from(jwt), athleteId, sessionId);
    }

    // US-20 · Cancela la sesión en progreso (contrato 14.6): 200 con la sesión CANCELLED. Las series registradas se
    // conservan. 409 si ya estaba finalizada o cancelada
    @PostMapping("/{sessionId}/cancel")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sesión cancelada con su resumen"),
            @ApiResponse(responseCode = "403", description = "Solo el atleta dueño puede cancelar la sesión"),
            @ApiResponse(responseCode = "404", description = "La sesión no existe o es de otro atleta"),
            @ApiResponse(responseCode = "409", description = "La sesión ya está finalizada o cancelada")
    })
    public TrainingSessionResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                          @PathVariable UUID sessionId) {
        return trainingSessionService.cancel(AuthenticatedUser.from(jwt), athleteId, sessionId);
    }
}
