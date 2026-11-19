package com.gestion_deportiva.api.note.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.note.model.enums.NoteType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NoteTest {

    private static final Instant CREATED_AT = Instant.parse("2026-11-10T12:00:00.123456789Z");
    private static final Instant READ_AT = Instant.parse("2026-11-11T09:30:00Z");

    private Coach coach;
    private Athlete athlete;

    @BeforeEach
    void setUp() {
        coach = coach("ana@test.com");
        athlete = athlete("leo@test.com", coach);
    }

    @Test
    void shouldTrimTextsAndTruncateCreatedAtToMicros() {
        // Act
        Note note = new Note(athlete, coach, NoteType.PRIVATE, "  Técnica  ", "  Bajar más lento  ", CREATED_AT);

        // Assert
        assertEquals("Técnica", note.getTitle());
        assertEquals("Bajar más lento", note.getContent());
        assertEquals(Instant.parse("2026-11-10T12:00:00.123456Z"), note.getCreatedAt());
        assertNull(note.getReadAt());
        assertFalse(note.isRead());
    }

    @Test
    void shouldAcceptTextsAtTheMaximumLength() {
        // Act
        Note note = new Note(athlete, coach, NoteType.PRIVATE, "t".repeat(Note.MAX_TITLE_LENGTH),
                "c".repeat(Note.MAX_CONTENT_LENGTH), CREATED_AT);

        // Assert
        assertEquals(Note.MAX_TITLE_LENGTH, note.getTitle().length());
        assertEquals(Note.MAX_CONTENT_LENGTH, note.getContent().length());
    }

    @Test
    void shouldRejectBlankOrTooLongTexts() {
        assertThrows(IllegalArgumentException.class,
                () -> new Note(athlete, coach, NoteType.PRIVATE, "   ", "Contenido", CREATED_AT));
        assertThrows(IllegalArgumentException.class,
                () -> new Note(athlete, coach, NoteType.PRIVATE, "Título", "", CREATED_AT));
        assertThrows(IllegalArgumentException.class, () -> new Note(athlete, coach, NoteType.PRIVATE,
                "t".repeat(Note.MAX_TITLE_LENGTH + 1), "Contenido", CREATED_AT));
        assertThrows(IllegalArgumentException.class, () -> new Note(athlete, coach, NoteType.PRIVATE, "Título",
                "c".repeat(Note.MAX_CONTENT_LENGTH + 1), CREATED_AT));
    }

    @Test
    void shouldRejectMissingRequiredData() {
        assertThrows(NullPointerException.class,
                () -> new Note(null, coach, NoteType.PRIVATE, "Título", "Contenido", CREATED_AT));
        assertThrows(NullPointerException.class,
                () -> new Note(athlete, null, NoteType.PRIVATE, "Título", "Contenido", CREATED_AT));
        assertThrows(NullPointerException.class,
                () -> new Note(athlete, coach, null, "Título", "Contenido", CREATED_AT));
        assertThrows(NullPointerException.class,
                () -> new Note(athlete, coach, NoteType.PRIVATE, null, "Contenido", CREATED_AT));
    }

    @Test
    void shouldMarkAVisibleNoteAsReadOnlyOnce() {
        // Arrange
        Note note = new Note(athlete, coach, NoteType.VISIBLE_TO_ATHLETE, "Título", "Contenido", CREATED_AT);

        // Act
        note.markAsRead(READ_AT);
        note.markAsRead(READ_AT.plusSeconds(3600));

        // Assert: conserva la primera lectura
        assertTrue(note.isRead());
        assertEquals(READ_AT, note.getReadAt());
    }

    @Test
    void shouldNotMarkAPrivateNoteAsRead() {
        // Arrange
        Note note = new Note(athlete, coach, NoteType.PRIVATE, "Título", "Contenido", CREATED_AT);

        // Act + Assert
        assertThrows(IllegalStateException.class, () -> note.markAsRead(READ_AT));
        assertNull(note.getReadAt());
    }
}
