package com.gestion_deportiva.api.meal.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

// La comida no existe, es de otro atleta o ya se borró (contrato 11.10): el mismo 404 en los tres casos
public class MealNotFoundException extends ResourceNotFoundException {

    public MealNotFoundException(UUID mealId) {
        super("No existe la comida con id " + mealId);
    }
}
