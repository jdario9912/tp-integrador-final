package com.gestion_deportiva.api.measurement.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

// El registro no existe o es de otro atleta: la misma respuesta en los dos casos (contrato 17.6)
public class BodyMeasurementRecordNotFoundException extends ResourceNotFoundException {

    public BodyMeasurementRecordNotFoundException(UUID recordId) {
        super("No existe el registro de medidas con id " + recordId);
    }
}
