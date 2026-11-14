package com.gestion_deportiva.api.training.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// La serie no está entre 1 y las series prescritas del ejercicio (US-19, contrato 11.6)
public class SetNumberOutOfRangeException extends BusinessRuleException {

    public SetNumberOutOfRangeException(int setNumber, int sets) {
        super("El ejercicio tiene " + sets + " series: la serie " + setNumber + " no existe");
    }
}
