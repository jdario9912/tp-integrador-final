package com.gestion_deportiva.api.note.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.note.model.enums.NoteType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

// Nota del entrenador sobre un atleta de su cartera (US-46, COM-01). El tipo decide si el atleta la ve; solo una
// nota visible puede marcarse como leída (ck_notes_read_at de la V17)
@Entity
@Table(name = "notes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class Note {

    // Mismos límites que las columnas de la V17 y la validación del request
    public static final int MAX_TITLE_LENGTH = 150;
    public static final int MAX_CONTENT_LENGTH = 2000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false, updatable = false)
    private Coach author;

    @Column(name = "note_type_id", nullable = false, updatable = false)
    private NoteType type;

    @Column(nullable = false, length = MAX_TITLE_LENGTH, updatable = false)
    private String title;

    @Column(nullable = false, length = MAX_CONTENT_LENGTH, updatable = false)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // null hasta que el atleta la marca como leída
    @Column(name = "read_at")
    private Instant readAt;

    public Note(Athlete athlete, Coach author, NoteType type, String title, String content, Instant createdAt) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        this.author = Objects.requireNonNull(author, "author");
        this.type = Objects.requireNonNull(type, "type");
        this.title = requireText(title, "title", MAX_TITLE_LENGTH);
        this.content = requireText(content, "content", MAX_CONTENT_LENGTH);
        this.createdAt = toDatabasePrecision(createdAt, "createdAt");
    }

    // Idempotente: una nota ya leída conserva la fecha de la primera lectura
    public void markAsRead(Instant at) {
        if (!type.isVisibleToAthlete()) {
            throw new IllegalStateException("Una nota privada no se puede marcar como leída");
        }
        if (readAt == null) {
            readAt = toDatabasePrecision(at, "readAt");
        }
    }

    public boolean isRead() {
        return readAt != null;
    }

    private static String requireText(String text, String name, int maxLength) {
        Objects.requireNonNull(text, name);
        String trimmed = text.trim();
        if (trimmed.isEmpty() || trimmed.length() > maxLength) {
            throw new IllegalArgumentException(name + " debe tener entre 1 y " + maxLength + " caracteres");
        }
        return trimmed;
    }

    // timestamptz guarda microsegundos: con la misma precisión, la respuesta del alta coincide con la del listado
    private static Instant toDatabasePrecision(Instant instant, String name) {
        return Objects.requireNonNull(instant, name).truncatedTo(ChronoUnit.MICROS);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Note other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Note.class.hashCode();
    }
}
