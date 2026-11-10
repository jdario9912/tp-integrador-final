package com.gestion_deportiva.api.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// Intensidad prescripta de un ejercicio: "RIR n" (repeticiones en reserva, entero de 0 a 10) o "RPE n"
// (esfuerzo percibido, de 1 a 10 con medios puntos). Sin distinguir mayúsculas; null o vacío es válido
@Documented
@Constraint(validatedBy = RirRpeValidator.class)
@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidRirRpe {

    String message() default "El RIR/RPE debe tener el formato \"RIR n\" (0 a 10) o \"RPE n\" (1 a 10)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
