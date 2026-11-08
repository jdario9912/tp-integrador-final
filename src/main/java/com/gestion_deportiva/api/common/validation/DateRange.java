package com.gestion_deportiva.api.common.validation;

import java.time.LocalDate;

// Rango de fechas de un filtro: desde y hasta, los dos opcionales e inclusivos. Lo valida @ValidDateRange
public interface DateRange {

    LocalDate from();

    LocalDate to();
}
