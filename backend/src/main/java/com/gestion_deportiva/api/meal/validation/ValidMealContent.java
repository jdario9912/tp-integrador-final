package com.gestion_deportiva.api.meal.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// La comida tiene que tener una descripción o al menos un alimento (contrato 11.3). Restricción de clase que registra
// el error en el campo "items", igual que @ValidDateRange registra el suyo en "from"
@Documented
@Constraint(validatedBy = ValidMealContentValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidMealContent {

    String message() default "Cargá una descripción o al menos un alimento";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
