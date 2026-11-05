package com.gestion_deportiva.api.exercise.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.exercise.dto.ExerciseRequest;
import com.gestion_deportiva.api.exercise.dto.ExerciseResponse;
import com.gestion_deportiva.api.exercise.dto.ExerciseSearchFilter;
import com.gestion_deportiva.api.exercise.service.ExerciseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

// Catálogo de ejercicios (US-38). Solo entrenadores (regla en SecurityConfig); la autoría la controla ExerciseService
@RestController
@RequestMapping("/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    // El ejercicio queda a nombre del entrenador autenticado (subject del JWT)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ExerciseResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestBody ExerciseRequest request) {
        ExerciseResponse response = exerciseService.create(UUID.fromString(jwt.getSubject()), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    // Globales + propios. ?page (desde 0) y ?size (máximo 100); ?name y ?muscleGroup son filtros opcionales
    @GetMapping
    public PageResponse<ExerciseResponse> findVisible(@AuthenticationPrincipal Jwt jwt,
                                                      @ParameterObject @Valid ExerciseSearchFilter filter,
                                                      @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return exerciseService.findVisible(UUID.fromString(jwt.getSubject()), filter, pageable);
    }

    @GetMapping("/{id}")
    public ExerciseResponse findById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return exerciseService.findById(UUID.fromString(jwt.getSubject()), id);
    }

    // Solo los propios: un global o uno de otro entrenador responde 403
    @PutMapping("/{id}")
    public ExerciseResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                   @Valid @RequestBody ExerciseRequest request) {
        return exerciseService.update(UUID.fromString(jwt.getSubject()), id, request);
    }

    // Baja lógica: deja de aparecer en el catálogo, pero las rutinas que lo usan no cambian
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        exerciseService.delete(UUID.fromString(jwt.getSubject()), id);
    }
}
