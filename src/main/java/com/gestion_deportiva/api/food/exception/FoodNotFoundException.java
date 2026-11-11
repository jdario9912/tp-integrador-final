package com.gestion_deportiva.api.food.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

public class FoodNotFoundException extends ResourceNotFoundException {

    public FoodNotFoundException(UUID foodId) {
        super("No existe el alimento con id " + foodId);
    }
}
