package com.gestion_deportiva.api.note.dto;

import com.gestion_deportiva.api.note.model.enums.NoteType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Alta de una nota (US-46). Sin athleteId: sale de la ruta; sin autor: es el entrenador del token
public record NoteRequest(

        @NotBlank(message = "El título es obligatorio")
        @Size(max = 150, message = "El título no puede superar los 150 caracteres")
        String title,

        @NotBlank(message = "El contenido es obligatorio")
        @Size(max = 2000, message = "El contenido no puede superar los 2000 caracteres")
        String content,

        // PRIVATE o VISIBLE_TO_ATHLETE; un valor desconocido responde 400 (JSON inválido)
        @NotNull(message = "El tipo de nota es obligatorio")
        NoteType type
) {
}
