package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.common.validation.DateRange;
import com.gestion_deportiva.api.common.validation.ValidDateRange;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

// US-21 · Rango opcional del historial de sesiones (contrato 15.2), de los query params ?from y ?to (YYYY-MM-DD,
// inclusivos sobre sessionDate). from posterior a to → 400 con el error en "from"; otro formato → 400 en ese campo
@ValidDateRange
public record TrainingSessionHistoryFilter(

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate from,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate to
) implements DateRange {
}
