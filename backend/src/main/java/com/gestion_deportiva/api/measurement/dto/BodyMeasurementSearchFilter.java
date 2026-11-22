package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.common.validation.DateRange;
import com.gestion_deportiva.api.common.validation.ValidDateRange;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

// Rango opcional del listado de registros de medidas (US-45), de los query params ?from y ?to (YYYY-MM-DD,
// inclusivos). from posterior a to → 400 con el error en "from"; otro formato → 400 en ese campo
@ValidDateRange
public record BodyMeasurementSearchFilter(

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate from,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate to
) implements DateRange {
}
