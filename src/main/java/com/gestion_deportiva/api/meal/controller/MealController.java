package com.gestion_deportiva.api.meal.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.meal.dto.DailyNutritionSummary;
import com.gestion_deportiva.api.meal.dto.MealRequest;
import com.gestion_deportiva.api.meal.dto.MealResponse;
import com.gestion_deportiva.api.meal.dto.MealSearchFilter;
import com.gestion_deportiva.api.meal.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

// Registro de comidas del atleta (US-23). Alta, edición y borrado solo ATHLETE; listado COACH y ATHLETE (reglas en
// SecurityConfig). Qué atleta puede usar cada uno lo decide MealService con AthleteAccessGuard
@RestController
@RequestMapping("/athletes/{athleteId}/meals")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;

    // Sin header Location: no hay un GET de una comida individual (contrato 11.4)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MealResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                               @Valid @RequestBody MealRequest request) {
        return mealService.create(AuthenticatedUser.from(jwt), athleteId, request);
    }

    // Edición completa. Una comida de otro atleta responde 404
    @PutMapping("/{mealId}")
    public MealResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                               @PathVariable UUID mealId, @Valid @RequestBody MealRequest request) {
        return mealService.update(AuthenticatedUser.from(jwt), athleteId, mealId, request);
    }

    // Borrado físico: 204 sin cuerpo
    @DeleteMapping("/{mealId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId, @PathVariable UUID mealId) {
        mealService.delete(AuthenticatedUser.from(jwt), athleteId, mealId);
    }

    // Comidas de un día (?date=YYYY-MM-DD; sin él, hoy en la zona de la app). Lista sin paginación, en el orden del
    // contrato (11.7). @ParameterObject: Swagger documenta el query param por separado
    @GetMapping
    public List<MealResponse> findByDay(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                        @ParameterObject @Valid MealSearchFilter filter) {
        return mealService.findByDay(AuthenticatedUser.from(jwt), athleteId, filter.date());
    }

    // US-24 · Resumen nutricional del día (contrato 16): mismo ?date y mismo acceso que el listado (los dos roles; la
    // pertenencia la decide el service). La regla de SecurityConfig va explícita: /summary no cae en la de /{mealId}
    @GetMapping("/summary")
    public DailyNutritionSummary summaryOfDay(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                              @ParameterObject @Valid MealSearchFilter filter) {
        return mealService.summaryOfDay(AuthenticatedUser.from(jwt), athleteId, filter.date());
    }
}
