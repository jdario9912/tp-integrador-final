package com.gestion_deportiva.api.meal.service;

import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.meal.dto.MealResponse;
import com.gestion_deportiva.api.meal.dto.ReviewMealRequest;
import com.gestion_deportiva.api.meal.exception.MealNotFoundException;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Revisión del entrenador sobre una comida (US-25). La regla de rol (solo COACH) vive en SecurityConfig; qué atleta
// puede revisar cada entrenador, AthleteAccessGuard. Orden: pertenencia (403) → comida inexistente o de otro atleta
// (404) → revisión con la hora de AppClock
@Slf4j
@Service
@RequiredArgsConstructor
public class MealReviewService {

    private final MealRepository mealRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final AppClock appClock;

    // El body es opcional: sin body, la revisión queda sin comentario. Revisar de nuevo reemplaza la anterior
    @Transactional
    public MealResponse review(AuthenticatedUser user, UUID athleteId, UUID mealId, ReviewMealRequest request) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        Meal meal = mealRepository.findByIdAndAthleteId(mealId, athleteId)
                .orElseThrow(() -> new MealNotFoundException(mealId));
        String observation = request == null ? null : request.observation();
        meal.review(appClock.now(), observation);
        log.info("El entrenador {} revisó la comida {} del atleta {}", user.id(), mealId, athleteId);
        return MealResponse.from(mealRepository.saveAndFlush(meal));
    }
}
