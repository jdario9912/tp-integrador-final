package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import com.gestion_deportiva.api.measurement.validation.ValidBodyMeasurementValue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Una medida del registro (US-45, contrato 17.4). Las reglas que dependen del tipo (lado y rango) las verifica
// ValidBodyMeasurementValue. Que el tipo exista lo resuelve Jackson: un código desconocido es un 400 sin fieldErrors
@ValidBodyMeasurementValue
public record BodyMeasurementValueRequest(

        @NotNull(message = "El tipo de medida es obligatorio")
        BodyMeasurementType type,

        // Obligatorio en las bilaterales y prohibido en las demás: lo controla ValidBodyMeasurementValue
        MeasurementSide side,

        // numeric(5,2) en la base: hasta 3 enteros y 2 decimales, mayor a 0. El rango de cada medida, en la restricción
        @NotNull(message = "El valor es obligatorio")
        @DecimalMin(value = "0", inclusive = false, message = "El valor debe ser mayor a 0")
        @Digits(integer = 3, fraction = 2, message = "El valor admite hasta 3 enteros y 2 decimales")
        BigDecimal value
) {
}
