package com.gestion_deportiva.api.coach.controller;

import com.gestion_deportiva.api.coach.dto.CoachResponse;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.service.CoachService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/coaches")
@RequiredArgsConstructor
public class CoachController {

    private final CoachService coachService;

    // El status real lo fija ResponseEntity.created; @ResponseStatus es para que Swagger documente el 201
    // @SecurityRequirements vacío: en Swagger figura como endpoint público (sin candado)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements
    public ResponseEntity<CoachResponse> register(@Valid @RequestBody RegisterCoachRequest request) {
        CoachResponse response = coachService.register(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }
}
