package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.training.model.enums.SetStatus;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Registrar o corregir una serie (US-19, contrato 11.3). Sin ids: salen de la ruta. Lo que pide cada estado
// (peso y reps si DONE; motivo si SKIPPED) lo controla @ValidPerformedSet, que informa cada error en su campo
@ValidPerformedSet
public record PerformedSetRequest(

        @NotNull(message = "Ingresá el estado de la serie")
        SetStatus status,

        // Solo DONE. Kilos, de 0 a 9999,99 con hasta 2 decimales
        BigDecimal weight,

        // Solo DONE. De 1 a 999
        Integer reps,

        // Opcional, de 1 a 10. Se descarta si la serie se omitió
        Integer rpe,

        // Solo SKIPPED: de 1 a 200 caracteres (sin espacios de los extremos)
        String skipReason
) {
}
