package com.gestion_deportiva.api.photo.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

// La foto no existe o es de otro atleta: la misma respuesta en los dos casos (contrato 4 y 5 de US-28)
public class ProgressPhotoNotFoundException extends ResourceNotFoundException {

    public ProgressPhotoNotFoundException(UUID photoId) {
        super("No existe la foto de progreso con id " + photoId);
    }
}
