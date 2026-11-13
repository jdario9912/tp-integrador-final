package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

// La rutina activa ya venció (US-17: "hoy" en la zona de la app es posterior a su último día vigente)
public class ExpiredRoutineException extends BusinessRuleException {

    // La fecha como la ve el usuario en la interfaz (DD/MM/AAAA)
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // endDate: último día vigente de la rutina (RoutineAssignment.endDate)
    public ExpiredRoutineException(LocalDate endDate) {
        super("Tu rutina venció el " + DISPLAY_DATE.format(endDate) + ". Pedile a tu entrenador una nueva");
    }
}
