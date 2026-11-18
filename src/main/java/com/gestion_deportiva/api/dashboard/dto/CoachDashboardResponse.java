package com.gestion_deportiva.api.dashboard.dto;

import java.util.List;

// US-11 · Dashboard del entrenador. Una métrica que falló va en null y su nombre (el del campo) en warnings: el
// resto se muestra igual. pendingReviewSessions.count es el total de sesiones sin revisar, no de atletas
public record CoachDashboardResponse(DashboardMetric<DashboardAthlete> activeAthletes,
                                     DashboardMetric<DashboardAthlete> withoutRoutine,
                                     DashboardMetric<PendingReviewAthlete> pendingReviewSessions,
                                     DashboardMetric<WeightGapAthlete> withoutRecentWeight,
                                     List<String> warnings) {
}
