package com.gestion_deportiva.api.athlete.controller;

import com.gestion_deportiva.api.athlete.dto.AthleteResponse;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.service.AthleteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/athletes")
@RequiredArgsConstructor
public class AthleteController {

    private final AthleteService athleteService;

    // Solo entrenadores (regla en SecurityConfig): el atleta queda asignado al entrenador autenticado,
    // cuyo id es el subject del JWT (lo firma JwtService)
    // El status real lo fija ResponseEntity.created; @ResponseStatus es para que Swagger documente el 201
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AthleteResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                  @Valid @RequestBody CreateAthleteRequest request) {
        AthleteResponse response = athleteService.create(UUID.fromString(jwt.getSubject()), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }
}
