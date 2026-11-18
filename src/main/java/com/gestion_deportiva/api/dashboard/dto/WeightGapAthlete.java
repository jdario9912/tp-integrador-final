package com.gestion_deportiva.api.dashboard.dto;

import com.gestion_deportiva.api.dashboard.repository.WeightGapRow;

import java.time.LocalDate;
import java.util.UUID;

// US-11 · Atleta sin peso reciente; lastRecordedOn es null si nunca registró uno
public record WeightGapAthlete(UUID id, String firstName, String lastName, LocalDate lastRecordedOn) {

    public static WeightGapAthlete from(WeightGapRow row) {
        return new WeightGapAthlete(row.getId(), row.getFirstName(), row.getLastName(), row.getLastRecordedOn());
    }
}
