package com.gestion_deportiva.api.weight.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// Alta y edición de un registro de peso (US-26, mismo body en POST y PUT). Sin athleteId: sale de la ruta.
// Que la fecha no sea futura lo valida WeightRecordService con el reloj y la zona de la app: @PastOrPresent
// usaría la zona de la JVM (UTC en el contenedor) y a las 22:00 de Argentina aceptaría la fecha de mañana
public record WeightRecordRequest(

        @NotNull(message = "La fecha es obligatoria")
        LocalDate date,

        // numeric(5,2) en la base: hasta 3 enteros y 2 decimales. De 20 a 300, inclusive
        @NotNull(message = "El peso es obligatorio")
        @DecimalMin(value = "20", message = "El peso debe estar entre 20 y 300 kg")
        @DecimalMax(value = "300", message = "El peso debe estar entre 20 y 300 kg")
        @Digits(integer = 3, fraction = 2, message = "El peso admite hasta 3 enteros y 2 decimales")
        BigDecimal weightKg,

        // Se cuenta lo que llega, antes de recortar los espacios; vacío o solo espacios se guarda null
        @Size(max = 500, message = "El comentario no puede superar los 500 caracteres")
        String comment
) {
}
