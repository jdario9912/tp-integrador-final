package com.gestion_deportiva.api.weight.dto;

import com.gestion_deportiva.api.common.validation.DateRange;
import com.gestion_deportiva.api.common.validation.ValidDateRange;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

// Rango opcional del listado de registros de peso (US-26), tomado de los query params ?from y ?to (YYYY-MM-DD,
// inclusivos). from posterior a to → 400 con el error en "from"; otro formato → 400 en ese campo
@ValidDateRange
public record WeightRecordSearchFilter(

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate from,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate to
) implements DateRange {
}
