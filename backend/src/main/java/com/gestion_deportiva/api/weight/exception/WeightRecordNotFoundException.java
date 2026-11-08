package com.gestion_deportiva.api.weight.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

// El registro no existe o es de otro atleta: la misma respuesta en los dos casos (contrato 8.5)
public class WeightRecordNotFoundException extends ResourceNotFoundException {

    public WeightRecordNotFoundException(UUID weightId) {
        super("No existe el registro de peso con id " + weightId);
    }
}
