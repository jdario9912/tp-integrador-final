package com.gestion_deportiva.api.note.exception;

import com.gestion_deportiva.api.common.exception.ResourceNotFoundException;

import java.util.UUID;

// La nota no existe, es de otro atleta o es privada (para el atleta): la misma respuesta en los tres casos
public class NoteNotFoundException extends ResourceNotFoundException {

    public NoteNotFoundException(UUID noteId) {
        super("No existe la nota con id " + noteId);
    }
}
