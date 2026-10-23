package com.gestion_deportiva.api.athlete.factory;

import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.coach.model.Coach;

// Datos para crear un atleta: el body de la request más el entrenador autenticado, que no viene en el body
public record NewAthlete(CreateAthleteRequest request, Coach coach) {
}
