package com.gestion_deportiva.api.dashboard.dto;

import java.util.List;

// US-11 · Una métrica del dashboard: el total y los atletas que la componen
public record DashboardMetric<T>(long count, List<T> athletes) {

    // El total es la cantidad de atletas de la lista
    public static <T> DashboardMetric<T> of(List<T> athletes) {
        return new DashboardMetric<>(athletes.size(), athletes);
    }
}
