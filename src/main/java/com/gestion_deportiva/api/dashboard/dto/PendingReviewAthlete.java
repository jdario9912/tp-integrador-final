package com.gestion_deportiva.api.dashboard.dto;

import com.gestion_deportiva.api.dashboard.repository.PendingReviewRow;

import java.util.UUID;

// US-11 · Atleta con sesiones finalizadas sin revisar
public record PendingReviewAthlete(UUID id, String firstName, String lastName, long pendingCount) {

    public static PendingReviewAthlete from(PendingReviewRow row) {
        return new PendingReviewAthlete(row.getId(), row.getFirstName(), row.getLastName(), row.getPendingCount());
    }
}
