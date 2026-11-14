package com.gestion_deportiva.api.meal.service;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.meal.dto.MealRequest;
import com.gestion_deportiva.api.meal.dto.MealResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Registro de comidas del atleta (US-23). La regla de rol (alta, edición y borrado solo ATHLETE; listado los dos
// roles) vive en SecurityConfig; la pertenencia, en el service con AthleteAccessGuard
public interface MealService {

    // Alta de la comida con sus ítems, en una sola transacción: si un alimento no existe no se crea nada
    MealResponse create(AuthenticatedUser user, UUID athleteId, MealRequest request);

    // Edición completa: reemplaza fecha, tipo, descripción e ítems. Si un alimento no existe no se modifica nada
    MealResponse update(AuthenticatedUser user, UUID athleteId, UUID mealId, MealRequest request);

    // Borrado físico de la comida y sus ítems. Una segunda vez responde 404
    void delete(AuthenticatedUser user, UUID athleteId, UUID mealId);

    // Comidas del día (null = hoy en la zona de la app), por tipo y por alta. Sin comidas, lista vacía
    List<MealResponse> findByDay(AuthenticatedUser user, UUID athleteId, LocalDate date);
}
