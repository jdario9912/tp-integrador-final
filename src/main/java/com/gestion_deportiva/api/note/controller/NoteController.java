package com.gestion_deportiva.api.note.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.note.dto.NoteRequest;
import com.gestion_deportiva.api.note.dto.NoteResponse;
import com.gestion_deportiva.api.note.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

// Notas del entrenador sobre el atleta (US-46). Alta solo COACH; listado los dos roles; marcar como leída solo
// ATHLETE (reglas en SecurityConfig). Qué atleta puede usar cada uno lo decide NoteService con AthleteAccessGuard
@RestController
@RequestMapping("/athletes/{athleteId}/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                               @Valid @RequestBody NoteRequest request) {
        return noteService.create(AuthenticatedUser.from(jwt), athleteId, request);
    }

    // De la más reciente a la más antigua. El atleta recibe solo las visibles
    @GetMapping
    public List<NoteResponse> findByAthlete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId) {
        return noteService.findByAthlete(AuthenticatedUser.from(jwt), athleteId);
    }

    // Idempotente: marcar de nuevo una nota leída conserva la fecha de la primera lectura
    @PatchMapping("/{noteId}/read")
    public NoteResponse markAsRead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                   @PathVariable UUID noteId) {
        return noteService.markAsRead(AuthenticatedUser.from(jwt), athleteId, noteId);
    }
}
