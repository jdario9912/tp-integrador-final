package com.gestion_deportiva.api.alert.repository;

import java.util.UUID;

// Atleta con rutina vigente: entrenamientos por semana que planifica la rutina y cuántos finalizó en la ventana
public interface ComplianceRow {

    UUID getAthleteId();

    Short getDaysPerWeek();

    Long getFinishedCount();
}
