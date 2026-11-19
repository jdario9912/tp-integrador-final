package com.gestion_deportiva.api.note.service;

import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.note.dto.NoteRequest;
import com.gestion_deportiva.api.note.dto.NoteResponse;
import com.gestion_deportiva.api.note.exception.NoteNotFoundException;
import com.gestion_deportiva.api.note.model.Note;
import com.gestion_deportiva.api.note.model.enums.NoteType;
import com.gestion_deportiva.api.note.repository.NoteRepository;
import com.gestion_deportiva.api.user.model.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    private static final UUID COACH_ID = UUID.randomUUID();
    private static final UUID ATHLETE_ID = UUID.randomUUID();
    private static final UUID NOTE_ID = UUID.randomUUID();
    private static final AuthenticatedUser COACH_USER = new AuthenticatedUser(COACH_ID, Role.COACH);
    private static final AuthenticatedUser ATHLETE_USER = new AuthenticatedUser(ATHLETE_ID, Role.ATHLETE);
    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private CoachRepository coachRepository;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private NoteService noteService;

    private Coach coach;
    private Athlete athlete;

    @BeforeEach
    void setUp() {
        noteService = new NoteService(noteRepository, athleteRepository, coachRepository, athleteAccessGuard,
                Clock.fixed(NOW, ZoneOffset.UTC));
        coach = coach("ana@test.com");
        athlete = athlete("leo@test.com", coach);
    }

    @Test
    void shouldOnlyExposeVisibleTypesToTheAthlete() {
        assertEquals(EnumSet.of(NoteType.VISIBLE_TO_ATHLETE), NoteService.ATHLETE_VISIBLE_TYPES);
    }

    // ---------- alta ----------

    @Test
    void shouldCreateTheNoteWithTheCoachAsAuthor() {
        // Arrange
        when(athleteRepository.getReferenceById(ATHLETE_ID)).thenReturn(athlete);
        when(coachRepository.getReferenceById(COACH_ID)).thenReturn(coach);
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        NoteResponse response = noteService.create(COACH_USER, ATHLETE_ID,
                new NoteRequest(" Técnica ", "Bajar más lento", NoteType.VISIBLE_TO_ATHLETE));

        // Assert
        ArgumentCaptor<Note> saved = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).saveAndFlush(saved.capture());
        assertEquals(coach, saved.getValue().getAuthor());
        assertEquals(athlete, saved.getValue().getAthlete());
        assertEquals("Técnica", response.title());
        assertEquals(NoteType.VISIBLE_TO_ATHLETE, response.type());
        assertEquals(NOW, response.createdAt());
    }

    @Test
    void shouldNotCreateTheNoteWhenTheAthleteBelongsToAnotherCoach() {
        // Arrange
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(COACH_USER, ATHLETE_ID);

        // Act + Assert
        assertThrows(AthleteAccessDeniedException.class, () -> noteService.create(COACH_USER, ATHLETE_ID,
                new NoteRequest("Título", "Contenido", NoteType.PRIVATE)));
        verifyNoInteractions(noteRepository);
    }

    // ---------- listado ----------

    @Test
    void shouldListEveryTypeForTheCoach() {
        // Arrange
        Note privateNote = new Note(athlete, coach, NoteType.PRIVATE, "Privada", "Contenido", NOW);
        when(noteRepository.findNewestFirst(ATHLETE_ID, EnumSet.allOf(NoteType.class)))
                .thenReturn(List.of(privateNote));

        // Act
        List<NoteResponse> notes = noteService.findByAthlete(COACH_USER, ATHLETE_ID);

        // Assert
        assertEquals(1, notes.size());
        assertEquals(NoteType.PRIVATE, notes.get(0).type());
    }

    @Test
    void shouldQueryOnlyVisibleNotesForTheAthlete() {
        // Arrange
        when(noteRepository.findNewestFirst(ATHLETE_ID, Set.of(NoteType.VISIBLE_TO_ATHLETE))).thenReturn(List.of());

        // Act
        noteService.findByAthlete(ATHLETE_USER, ATHLETE_ID);

        // Assert: el filtro va en la consulta, las privadas no se leen
        verify(athleteAccessGuard).verifyAccess(ATHLETE_USER, ATHLETE_ID);
        verify(noteRepository).findNewestFirst(ATHLETE_ID, Set.of(NoteType.VISIBLE_TO_ATHLETE));
    }

    // ---------- marcar como leída ----------

    @Test
    void shouldMarkTheVisibleNoteAsRead() {
        // Arrange
        Note note = new Note(athlete, coach, NoteType.VISIBLE_TO_ATHLETE, "Título", "Contenido",
                NOW.minusSeconds(60));
        when(noteRepository.findByIdAndAthleteIdAndTypeIn(NOTE_ID, ATHLETE_ID, NoteService.ATHLETE_VISIBLE_TYPES))
                .thenReturn(Optional.of(note));

        // Act
        NoteResponse response = noteService.markAsRead(ATHLETE_USER, ATHLETE_ID, NOTE_ID);

        // Assert
        assertEquals(NOW, response.readAt());
    }

    @Test
    void shouldReturn404WhenTheNoteIsMissingOrPrivate() {
        // Arrange: la consulta solo busca visibles, una privada no aparece
        when(noteRepository.findByIdAndAthleteIdAndTypeIn(NOTE_ID, ATHLETE_ID, NoteService.ATHLETE_VISIBLE_TYPES))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThrows(NoteNotFoundException.class, () -> noteService.markAsRead(ATHLETE_USER, ATHLETE_ID, NOTE_ID));
    }
}
