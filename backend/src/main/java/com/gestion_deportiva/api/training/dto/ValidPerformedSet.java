package com.gestion_deportiva.api.training.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// Reglas de una serie que dependen del estado (US-19, contrato 11.3): DONE exige peso y repeticiones; SKIPPED exige el
// motivo. Cada error sale en el campo que corresponde (fieldErrors). El mensaje por defecto no se usa
@Documented
@Constraint(validatedBy = PerformedSetValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPerformedSet {

    String message() default "La serie no es válida";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
