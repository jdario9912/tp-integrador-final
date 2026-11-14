package com.gestion_deportiva.api.training.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import com.gestion_deportiva.api.training.dto.PerformedSetRequest;
import com.gestion_deportiva.api.training.dto.TrainingSessionResponse;
import com.gestion_deportiva.api.training.service.PerformedSetService;
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

// Series registradas en vivo (US-19, contrato 11): solo el atleta registra y corrige las suyas (regla en
// SecurityConfig). La pertenencia y las reglas de la sesión, PerformedSetService. Cuelga de la sesión como su
// detalle (10.5)
@RestController
@RequestMapping("/athletes/{athleteId}/sessions/{sessionId}/exercises/{routineExerciseId}/sets")
@RequiredArgsConstructor
public class PerformedSetController {

    private final PerformedSetService performedSetService;

    // Crea o reemplaza la serie (idempotente, 11.2) y responde 200 con la sesión completa (11.4), para que el
    // cliente reemplace la caché del detalle y la de en progreso sin pedirla otra vez. {routineExerciseId} es el id
    // del ejercicio del día, no el del catálogo. La validación del body (400) va antes que cualquier consulta
    @PutMapping("/{setNumber}")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Serie registrada o corregida: la sesión completa"),
            @ApiResponse(responseCode = "400", description = "Validación de la serie o del cuerpo"),
            @ApiResponse(responseCode = "409", description = "La sesión ya no está en curso"),
            @ApiResponse(responseCode = "422", description = "El ejercicio no es del día o la serie no existe")
    })
    public TrainingSessionResponse record(@AuthenticationPrincipal Jwt jwt,
                                          @PathVariable UUID athleteId,
                                          @PathVariable UUID sessionId,
                                          @PathVariable UUID routineExerciseId,
                                          @PathVariable int setNumber,
                                          @Valid @RequestBody PerformedSetRequest request) {
        return performedSetService.record(AuthenticatedUser.from(jwt), athleteId, sessionId, routineExerciseId,
                setNumber, request);
    }
}
