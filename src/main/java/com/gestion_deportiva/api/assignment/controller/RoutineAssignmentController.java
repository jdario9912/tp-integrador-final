package com.gestion_deportiva.api.assignment.controller;

import com.gestion_deportiva.api.assignment.dto.AssignRoutineRequest;
import com.gestion_deportiva.api.assignment.dto.RoutineAssignmentResponse;
import com.gestion_deportiva.api.assignment.service.RoutineAssignmentService;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// Rutinas asignadas al atleta (US-16). Solo COACH (regla en SecurityConfig); la pertenencia del atleta y de la
// rutina la controla RoutineAssignmentService
@RestController
@RequestMapping("/athletes/{athleteId}/assignments")
@RequiredArgsConstructor
public class RoutineAssignmentController {

    private final RoutineAssignmentService routineAssignmentService;

    // Si el atleta ya tiene otra rutina activa responde 409: se reintenta con replaceActive = true para que la
    // anterior pase a inactiva. Sin header Location: no hay un GET de una asignación individual.
    // @ResponseStatus fija el 201 y lo documenta en Swagger
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoutineAssignmentResponse assign(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                            @Valid @RequestBody AssignRoutineRequest request) {
        return routineAssignmentService.assign(UUID.fromString(jwt.getSubject()), athleteId, request);
    }

    // Historial: primero la activa (si hay) y después de la más reciente a la más antigua.
    // ?page (desde 0) y ?size (máximo 100); el sort del cliente se ignora
    @GetMapping
    public PageResponse<RoutineAssignmentResponse> findByAthlete(@AuthenticationPrincipal Jwt jwt,
                                                                 @PathVariable UUID athleteId,
                                                                 @ParameterObject @PageableDefault(size = 20)
                                                                 Pageable pageable) {
        return routineAssignmentService.findByAthlete(AuthenticatedUser.from(jwt), athleteId, pageable);
    }
}
