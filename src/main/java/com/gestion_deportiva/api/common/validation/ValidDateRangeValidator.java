package com.gestion_deportiva.api.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidDateRangeValidator implements ConstraintValidator<ValidDateRange, DateRange> {

    // Sin alguna de las dos fechas no hay nada que comparar: el rango queda abierto de ese lado
    @Override
    public boolean isValid(DateRange range, ConstraintValidatorContext context) {
        if (range == null || range.from() == null || range.to() == null || !range.from().isAfter(range.to())) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode("from")
                .addConstraintViolation();
        return false;
    }
}
