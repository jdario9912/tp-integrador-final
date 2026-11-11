package com.gestion_deportiva.api.food.service;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.food.dto.FoodRequest;
import com.gestion_deportiva.api.food.dto.FoodResponse;
import com.gestion_deportiva.api.food.dto.FoodSearchFilter;
import com.gestion_deportiva.api.food.exception.FoodNameAlreadyExistsException;
import com.gestion_deportiva.api.food.exception.FoodNotFoundException;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static com.gestion_deportiva.api.food.repository.FoodSpecifications.nameContains;

// Catálogo de alimentos (US-39). Es global: no recibe el id del usuario porque no hay autoría ni pertenencia.
// Qué rol puede crear y editar lo decide SecurityConfig
@Service
@RequiredArgsConstructor
public class FoodService {

    // Orden fijo del listado: el "sort" del cliente se ignora (ver ExerciseService.CATALOG_SORT).
    // El id desempata para que la paginación sea estable
    static final Sort CATALOG_SORT = Sort.by("name", "id");

    private final FoodRepository foodRepository;

    @Transactional
    public FoodResponse create(FoodRequest request) {
        String name = request.name().trim();
        if (foodRepository.existsByNameIgnoreCase(name)) {
            throw new FoodNameAlreadyExistsException(name);
        }

        Food food = Food.builder()
                .name(name)
                .referencePortionG(request.referencePortionG())
                .caloriesKcal(request.caloriesKcal())
                .proteinG(request.proteinG())
                .carbsG(request.carbsG())
                .fatG(request.fatG())
                .build();

        // saveAndFlush ejecuta el INSERT acá: si dos altas simultáneas chocan contra ux_foods_name,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler (409)
        return FoodResponse.from(foodRepository.saveAndFlush(food));
    }

    @Transactional(readOnly = true)
    public PageResponse<FoodResponse> findAll(FoodSearchFilter filter, Pageable pageable) {
        Pageable page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), CATALOG_SORT);
        return PageResponse.from(foodRepository.findAll(nameContains(filter.name()), page).map(FoodResponse::from));
    }

    @Transactional(readOnly = true)
    public FoodResponse findById(UUID foodId) {
        return FoodResponse.from(findExisting(foodId));
    }

    // Edición completa: reemplaza el nombre y toda la información nutricional
    @Transactional
    public FoodResponse update(UUID foodId, FoodRequest request) {
        Food food = findExisting(foodId);

        // Solo se consulta si cambia: el propio nombre (en otras mayúsculas) no es un duplicado
        String name = request.name().trim();
        if (!name.equalsIgnoreCase(food.getName()) && foodRepository.existsByNameIgnoreCase(name)) {
            throw new FoodNameAlreadyExistsException(name);
        }

        food.rename(name);
        food.updateNutrition(request.referencePortionG(), request.caloriesKcal(), request.proteinG(),
                request.carbsG(), request.fatG());

        // saveAndFlush: igual que en create, una carrera contra el índice único sale como 409
        return FoodResponse.from(foodRepository.saveAndFlush(food));
    }

    private Food findExisting(UUID foodId) {
        return foodRepository.findById(foodId)
                .orElseThrow(() -> new FoodNotFoundException(foodId));
    }
}
