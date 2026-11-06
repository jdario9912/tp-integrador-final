package com.gestion_deportiva.api.routine.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.routine.dto.RoutineRequest;
import com.gestion_deportiva.api.routine.dto.RoutineResponse;
import com.gestion_deportiva.api.routine.service.RoutineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

// Rutinas (US-13). Solo entrenadores (regla en SecurityConfig); la pertenencia la controla RoutineService
@RestController
@RequestMapping("/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    // La rutina queda a nombre del entrenador autenticado (subject del JWT)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<RoutineResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                  @Valid @RequestBody RoutineRequest request) {
        RoutineResponse response = routineService.create(UUID.fromString(jwt.getSubject()), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    // Mis rutinas, ordenadas por nombre. ?page (desde 0) y ?size (máximo 100)
    @GetMapping
    public PageResponse<RoutineResponse> findMine(@AuthenticationPrincipal Jwt jwt,
                                                  @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return routineService.findMine(UUID.fromString(jwt.getSubject()), pageable);
    }

    // La de otro entrenador responde 403
    @GetMapping("/{id}")
    public RoutineResponse findById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return routineService.findById(UUID.fromString(jwt.getSubject()), id);
    }
}
