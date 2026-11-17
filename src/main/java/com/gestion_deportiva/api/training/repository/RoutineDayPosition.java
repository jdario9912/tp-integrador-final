package com.gestion_deportiva.api.training.repository;

import java.util.UUID;

// US-12 · Día de una sesión y su posición en la rutina (contrato 9.6): solo lo que necesita la rotación del día que
// toca. Lo proyecta la consulta del último entrenamiento finalizado, sin cargar la sesión ni el día completos
public interface RoutineDayPosition {

    UUID getDayId();

    short getDayNumber();
}
