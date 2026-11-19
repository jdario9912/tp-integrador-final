package com.gestion_deportiva.api.note.service;

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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

// Notas del entrenador sobre el atleta (US-46, SVC-07). La regla de rol (alta solo COACH, lectura solo ATHLETE)
// vive en SecurityConfig; la pertenencia, acá con AthleteAccessGuard. Un atleta nunca recibe notas privadas: el
// filtro por tipo va en la consulta, no en memoria
@Service
@RequiredArgsConstructor
public class NoteService {

    // Los tipos que ve el atleta salen del catálogo (visible_to_athlete), no de una constante suelta
    static final Set<NoteType> ATHLETE_VISIBLE_TYPES = Arrays.stream(NoteType.values())
            .filter(NoteType::isVisibleToAthlete)
            .collect(Collectors.toCollection(() -> EnumSet.noneOf(NoteType.class)));

    private final NoteRepository noteRepository;
    private final AthleteRepository athleteRepository;
    private final CoachRepository coachRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final Clock clock;

    @Transactional
    public NoteResponse create(AuthenticatedUser user, UUID athleteId, NoteRequest request) {
        athleteAccessGuard.verifyAccess(user, athleteId);

        // El guard ya comprobó que el atleta existe y es del entrenador: alcanzan las referencias
        Athlete athlete = athleteRepository.getReferenceById(athleteId);
        Coach author = coachRepository.getReferenceById(user.id());
        Note note = new Note(athlete, author, request.type(), request.title(), request.content(), clock.instant());

        return NoteResponse.from(noteRepository.saveAndFlush(note));
    }

    // El entrenador ve todas; el atleta, solo las visibles
    @Transactional(readOnly = true)
    public List<NoteResponse> findByAthlete(AuthenticatedUser user, UUID athleteId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        return noteRepository.findNewestFirst(athleteId, typesVisibleTo(user)).stream()
                .map(NoteResponse::from)
                .toList();
    }

    // Solo el atleta (SecurityConfig). Una nota privada responde 404, igual que una inexistente: no se revela
    @Transactional
    public NoteResponse markAsRead(AuthenticatedUser user, UUID athleteId, UUID noteId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        Note note = noteRepository.findByIdAndAthleteIdAndTypeIn(noteId, athleteId, ATHLETE_VISIBLE_TYPES)
                .orElseThrow(() -> new NoteNotFoundException(noteId));
        note.markAsRead(clock.instant());
        return NoteResponse.from(note);
    }

    private static Set<NoteType> typesVisibleTo(AuthenticatedUser user) {
        return user.role() == Role.ATHLETE ? ATHLETE_VISIBLE_TYPES : EnumSet.allOf(NoteType.class);
    }
}
