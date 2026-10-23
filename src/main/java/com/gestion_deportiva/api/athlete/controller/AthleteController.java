package com.gestion_deportiva.api.athlete.controller;

import com.gestion_deportiva.api.athlete.dto.AthleteResponse;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.service.AthleteService;
import com.gestion_deportiva.api.auth.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/athletes")
@RequiredArgsConstructor
@SecurityRequirement(name = OpenApiConfig.BASIC_AUTH_SCHEME)
public class AthleteController {

    private final AthleteService athleteService;

    // Solo entrenadores (regla en SecurityConfig): el atleta queda asignado al entrenador autenticado.
    // El status real lo fija ResponseEntity.created; @ResponseStatus es para que Swagger documente el 201
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AthleteResponse> create(@AuthenticationPrincipal AuthenticatedUser coach,
                                                  @Valid @RequestBody CreateAthleteRequest request) {
        AthleteResponse response = athleteService.create(coach.getId(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }
}
