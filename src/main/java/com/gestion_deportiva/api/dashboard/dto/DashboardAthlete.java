package com.gestion_deportiva.api.dashboard.dto;

import com.gestion_deportiva.api.dashboard.repository.DashboardAthleteRow;

import java.util.UUID;

// US-11 · Atleta de una métrica: el id sirve para enlazar a su ficha
public record DashboardAthlete(UUID id, String firstName, String lastName) {

    public static DashboardAthlete from(DashboardAthleteRow row) {
        return new DashboardAthlete(row.getId(), row.getFirstName(), row.getLastName());
    }
}
