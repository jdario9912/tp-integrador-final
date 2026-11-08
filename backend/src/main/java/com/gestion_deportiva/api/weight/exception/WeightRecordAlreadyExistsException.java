package com.gestion_deportiva.api.weight.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

// El atleta ya tiene un registro de peso ese día (uno por día, ux_weight_records_athlete_recorded_on)
public class WeightRecordAlreadyExistsException extends ConflictException {

    // La fecha como la ve el usuario en la interfaz (DD/MM/AAAA)
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public WeightRecordAlreadyExistsException(LocalDate date) {
        super("Ya existe un registro de peso para el " + DISPLAY_DATE.format(date));
    }
}
