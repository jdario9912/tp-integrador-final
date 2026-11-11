package com.gestion_deportiva.api.food.repository;

import com.gestion_deportiva.api.food.model.Food;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

// JpaSpecificationExecutor: catálogo paginado con búsqueda opcional por nombre (US-39, ver FoodSpecifications)
public interface FoodRepository extends JpaRepository<Food, UUID>, JpaSpecificationExecutor<Food> {

    // Nombre repetido en el catálogo global, sin distinguir mayúsculas (ux_foods_name)
    boolean existsByNameIgnoreCase(String name);
}
