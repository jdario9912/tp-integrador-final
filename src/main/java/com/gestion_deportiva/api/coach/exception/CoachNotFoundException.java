package com.gestion_deportiva.api.coach.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

public class CoachNotFoundException extends ResourceNotFoundException {

    private final UUID coachId;

    public CoachNotFoundException(UUID coachId) {
        super("No existe el entrenador con id " + coachId);
        this.coachId = coachId;
    }

    public UUID getCoachId() {
        return coachId;
    }
}
