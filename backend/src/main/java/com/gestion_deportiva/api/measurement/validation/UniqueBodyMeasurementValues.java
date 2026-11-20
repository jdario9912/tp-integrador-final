package com.gestion_deportiva.api.measurement.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// Un mismo tipo y lado no puede repetirse dentro del registro (contrato 17.4). El error va a "values", igual que
// @ValidMealContent registra el suyo en "items"
@Documented
@Constraint(validatedBy = UniqueBodyMeasurementValuesValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface UniqueBodyMeasurementValues {

    String message() default "Hay dos medidas del mismo tipo y lado";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
