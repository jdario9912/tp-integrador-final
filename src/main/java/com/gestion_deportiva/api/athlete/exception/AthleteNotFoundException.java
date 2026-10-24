package com.gestion_deportiva.api.athlete.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

public class AthleteNotFoundException extends ResourceNotFoundException {

    private final UUID athleteId;

    public AthleteNotFoundException(UUID athleteId) {
        super("No existe el atleta con id " + athleteId);
        this.athleteId = athleteId;
    }

    public UUID getAthleteId() {
        return athleteId;
    }
}
