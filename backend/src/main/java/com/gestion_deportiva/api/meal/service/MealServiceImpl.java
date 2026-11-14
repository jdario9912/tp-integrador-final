package com.gestion_deportiva.api.meal.service;

import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.food.exception.FoodNotFoundException;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
import com.gestion_deportiva.api.meal.dto.MealItemRequest;
import com.gestion_deportiva.api.meal.dto.MealRequest;
import com.gestion_deportiva.api.meal.dto.MealResponse;
import com.gestion_deportiva.api.meal.exception.FutureMealDateException;
import com.gestion_deportiva.api.meal.exception.MealNotFoundException;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.MealItem;
import com.gestion_deportiva.api.meal.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static java.util.function.Function.identity;
import static java.util.stream.Collectors.toMap;

// Orden de evaluación del contrato (11.10): validación del body con fecha futura (400) → pertenencia, que incluye el
// atleta inexistente (404 y 403) → comida inexistente o ajena (404) → cada alimento (404) → guardar.
// La validación del body (incluida la regla de descripción o alimento) ya la hizo Bean Validation antes de llegar acá
@Service
@RequiredArgsConstructor
public class MealServiceImpl implements MealService {

    private final MealRepository mealRepository;
    private final AthleteRepository athleteRepository;
    private final FoodRepository foodRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final AppClock appClock;

    @Override
    @Transactional
    public MealResponse create(AuthenticatedUser user, UUID athleteId, MealRequest request) {
        requireNotFuture(request.date());
        athleteAccessGuard.verifyAccess(user, athleteId);

        List<MealItem> items = buildItems(request.items());
        // El guard ya comprobó que el atleta existe: alcanza con la referencia (no consulta la base)
        Meal meal = new Meal(athleteRepository.getReferenceById(athleteId), request.date(), request.type(),
                request.description(), items, appClock.now());

        return MealResponse.from(mealRepository.saveAndFlush(meal));
    }

    // Edición completa. Los alimentos se resuelven antes de tocar la comida: si uno no existe, no cambia nada
    @Override
    @Transactional
    public MealResponse update(AuthenticatedUser user, UUID athleteId, UUID mealId, MealRequest request) {
        requireNotFuture(request.date());
        athleteAccessGuard.verifyAccess(user, athleteId);

        Meal meal = findOwnedMeal(athleteId, mealId);
        List<MealItem> items = buildItems(request.items());
        meal.correct(request.date(), request.type(), request.description(), items, appClock.now());

        return MealResponse.from(mealRepository.saveAndFlush(meal));
    }

    @Override
    @Transactional
    public void delete(AuthenticatedUser user, UUID athleteId, UUID mealId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        mealRepository.delete(findOwnedMeal(athleteId, mealId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MealResponse> findByDay(AuthenticatedUser user, UUID athleteId, LocalDate date) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        // Una fecha futura no es error al leer: responde lista vacía (contrato 11.7)
        LocalDate day = date != null ? date : appClock.today();
        return mealRepository.findDay(athleteId, day).stream()
                .map(MealResponse::from)
                .toList();
    }

    // Se valida antes que el atleta (paso 3 del contrato): es un 400 de validación y no revela nada del atleta
    private void requireNotFuture(LocalDate date) {
        if (date.isAfter(appClock.today())) {
            throw new FutureMealDateException();
        }
    }

    // Después de la pertenencia: solo el dueño puede saber si un id de comida existe
    private Meal findOwnedMeal(UUID athleteId, UUID mealId) {
        return mealRepository.findByIdAndAthleteId(mealId, athleteId)
                .orElseThrow(() -> new MealNotFoundException(mealId));
    }

    // Una sola consulta para todos los alimentos. Si falta alguno, 404 con el primero que no se encontró (en el orden
    // del body) y no se crea ningún ítem
    private List<MealItem> buildItems(List<MealItemRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }
        List<UUID> foodIds = requests.stream().map(MealItemRequest::foodId).distinct().toList();
        Map<UUID, Food> foodsById = foodRepository.findAllById(foodIds).stream()
                .collect(toMap(Food::getId, identity()));

        return requests.stream()
                .map(request -> MealItem.of(foodOrThrow(foodsById, request.foodId()), request.quantityG()))
                .toList();
    }

    private static Food foodOrThrow(Map<UUID, Food> foodsById, UUID foodId) {
        return Optional.ofNullable(foodsById.get(foodId))
                .orElseThrow(() -> new FoodNotFoundException(foodId));
    }
}
