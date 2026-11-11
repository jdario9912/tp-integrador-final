package com.gestion_deportiva.api.food.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

public class FoodNameAlreadyExistsException extends ConflictException {

    public FoodNameAlreadyExistsException(String name) {
        super("Ya existe un alimento llamado " + name + " en el catálogo");
    }
}
