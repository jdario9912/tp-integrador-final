package com.gestion_deportiva.api.measurement.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// Reglas de una medida que dependen de su tipo (contrato 17.4): el lado según sea bilateral, y el valor dentro del
// rango de la medida. Los errores van a "side" y "value" de la medida (values[i].side, values[i].value)
@Documented
@Constraint(validatedBy = ValidBodyMeasurementValueValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidBodyMeasurementValue {

    String message() default "La medida no es válida";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
