package com.gestion_deportiva.api.dashboard.repository;

import java.util.UUID;

// US-11 · Atleta de una métrica del dashboard: lo justo para mostrarlo y enlazar a su ficha. Los alias de las
// consultas de CoachDashboardRepository coinciden con estos nombres
public interface DashboardAthleteRow {

    UUID getId();

    String getFirstName();

    String getLastName();
}
