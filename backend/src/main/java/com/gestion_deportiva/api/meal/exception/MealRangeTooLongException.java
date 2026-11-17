package com.gestion_deportiva.api.meal.exception;

import com.gestion_deportiva.api.common.exception.FieldValidationException;

// US-25 · El rango de la vista de alimentación supera los 31 días: 400 con el error en "to"
public class MealRangeTooLongException extends FieldValidationException {

    public static final int MAX_DAYS = 31;
    public static final String FIELD = "to";
    public static final String MESSAGE = "El rango no puede superar los " + MAX_DAYS + " días";

    public MealRangeTooLongException() {
        super(FIELD, MESSAGE);
    }
}
