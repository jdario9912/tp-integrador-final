package com.gestion_deportiva.api.measurement.exception;

import com.gestion_deportiva.api.common.exception.ConflictException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

// El atleta ya tiene un registro de medidas ese día (uno por día, ux_body_measurement_records_athlete_measured_on)
public class BodyMeasurementRecordAlreadyExistsException extends ConflictException {

    // La fecha como la ve el usuario en la interfaz (DD/MM/AAAA)
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public BodyMeasurementRecordAlreadyExistsException(LocalDate date) {
        super("Ya existe un registro de medidas para el " + DISPLAY_DATE.format(date));
    }
}
