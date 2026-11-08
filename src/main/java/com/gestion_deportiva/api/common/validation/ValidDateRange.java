package com.gestion_deportiva.api.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// "from" no puede ser posterior a "to" (iguales es un solo día). Restricción de clase que registra el error en el
// campo "from": GlobalExceptionHandler solo convierte los errores de campo en fieldErrors
@Documented
@Constraint(validatedBy = ValidDateRangeValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDateRange {

    String message() default "La fecha desde no puede ser posterior a la fecha hasta";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
