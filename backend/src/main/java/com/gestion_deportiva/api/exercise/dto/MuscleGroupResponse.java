package com.gestion_deportiva.api.exercise.dto;

import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
import com.gestion_deportiva.api.exercise.model.enums.MuscleRegion;

public record MuscleGroupResponse(
        MuscleGroup code,
        String name,
        MuscleRegion region
) {

    public static MuscleGroupResponse from(MuscleGroup muscleGroup) {
        return new MuscleGroupResponse(muscleGroup, muscleGroup.getDisplayName(), muscleGroup.getRegion());
    }
}
