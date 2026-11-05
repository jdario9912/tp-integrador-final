package com.gestion_deportiva.api.exercise.controller;

import com.gestion_deportiva.api.exercise.dto.MuscleGroupResponse;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

// Grupos musculares precargados (US-38), para los selects del front. Catálogo fijo: se lee del enum, que
// CatalogSchemaTest mantiene igual a la tabla muscle_groups
@RestController
@RequestMapping("/muscle-groups")
public class MuscleGroupController {

    private static final List<MuscleGroupResponse> MUSCLE_GROUPS = Arrays.stream(MuscleGroup.values())
            .map(MuscleGroupResponse::from)
            .toList();

    @GetMapping
    public List<MuscleGroupResponse> findAll() {
        return MUSCLE_GROUPS;
    }
}
