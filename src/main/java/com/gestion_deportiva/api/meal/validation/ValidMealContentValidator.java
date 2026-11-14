package com.gestion_deportiva.api.meal.validation;

import com.gestion_deportiva.api.meal.dto.MealRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidMealContentValidator implements ConstraintValidator<ValidMealContent, MealRequest> {

    // Una descripción con solo espacios cuenta como ausente (se guarda null)
    @Override
    public boolean isValid(MealRequest request, ConstraintValidatorContext context) {
        if (request == null || hasDescription(request) || !request.items().isEmpty()) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode("items")
                .addConstraintViolation();
        return false;
    }

    private static boolean hasDescription(MealRequest request) {
        return request.description() != null && !request.description().isBlank();
    }
}
