package com.gestion_deportiva.api.food.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.food.dto.FoodRequest;
import com.gestion_deportiva.api.food.dto.FoodResponse;
import com.gestion_deportiva.api.food.dto.FoodSearchFilter;
import com.gestion_deportiva.api.food.service.FoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

// Catálogo de alimentos (US-39). Consultan los dos roles; crean y editan solo los entrenadores (SecurityConfig)
@RestController
@RequestMapping("/foods")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<FoodResponse> create(@Valid @RequestBody FoodRequest request) {
        FoodResponse response = foodService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    // Ordenado por nombre. ?page (desde 0) y ?size (máximo 100); ?name es un filtro opcional
    @GetMapping
    public PageResponse<FoodResponse> findAll(@ParameterObject @Valid FoodSearchFilter filter,
                                              @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return foodService.findAll(filter, pageable);
    }

    @GetMapping("/{id}")
    public FoodResponse findById(@PathVariable UUID id) {
        return foodService.findById(id);
    }

    // Cualquier entrenador edita cualquier alimento: el catálogo es global
    @PutMapping("/{id}")
    public FoodResponse update(@PathVariable UUID id, @Valid @RequestBody FoodRequest request) {
        return foodService.update(id, request);
    }
}
