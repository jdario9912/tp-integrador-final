package com.gestion_deportiva.api.dashboard.repository;

// US-11 · Atleta con sesiones finalizadas sin revisar y cuántas son (count de la base, bigint)
public interface PendingReviewRow extends DashboardAthleteRow {

    Long getPendingCount();
}
