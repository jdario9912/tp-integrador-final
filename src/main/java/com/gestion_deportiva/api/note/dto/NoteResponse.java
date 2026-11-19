package com.gestion_deportiva.api.note.dto;

import com.gestion_deportiva.api.note.model.Note;
import com.gestion_deportiva.api.note.model.enums.NoteType;

import java.time.Instant;
import java.util.UUID;

// Sin athleteId: los endpoints cuelgan de /athletes/{athleteId}. readAt es null mientras no se leyó
public record NoteResponse(
        UUID id,
        String title,
        String content,
        NoteType type,
        Instant createdAt,
        Instant readAt
) {

    public static NoteResponse from(Note note) {
        return new NoteResponse(note.getId(), note.getTitle(), note.getContent(), note.getType(),
                note.getCreatedAt(), note.getReadAt());
    }
}
