package com.gestion_deportiva.api.photo.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.photo.dto.ProgressPhotoResponse;
import com.gestion_deportiva.api.photo.dto.ProgressPhotoUploadRequest;
import com.gestion_deportiva.api.photo.service.ProgressPhotoService;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

// Fotos de progreso del atleta (US-28). Subir y borrar: solo ATHLETE (reglas en SecurityConfig). Listar y ver el
// detalle: los dos roles. Qué atleta puede usar cada uno lo decide ProgressPhotoService con AthleteAccessGuard
@RestController
@RequestMapping("/athletes/{athleteId}/photos")
@RequiredArgsConstructor
public class ProgressPhotoController {

    private final ProgressPhotoService progressPhotoService;

    // Subida multipart: file, type (FRONT, SIDE o BACK) y takenOn opcional (AAAA-MM-DD). Son @RequestPart (no
    // @RequestParam) para que Swagger documente cada parte del formulario, y son opcionales en la firma para que la
    // validación sea del service y el 400 salga con fieldErrors. 201 con Location al detalle (la URL firmada de la
    // respuesta ya sirve). @ResponseStatus documenta el 201 en Swagger
    // consumes: Swagger documenta el cuerpo como multipart/form-data (sin esto, como JSON)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ProgressPhotoResponse> upload(@AuthenticationPrincipal Jwt jwt,
                                                        @PathVariable UUID athleteId,
                                                        @RequestPart(value = "file", required = false)
                                                        MultipartFile file,
                                                        @RequestPart(value = "type", required = false) String type,
                                                        @RequestPart(value = "takenOn", required = false)
                                                        String takenOn) {
        ProgressPhotoResponse photo = progressPhotoService.upload(AuthenticatedUser.from(jwt), athleteId,
                new ProgressPhotoUploadRequest(file, type, takenOn));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{photoId}")
                .buildAndExpand(photo.id())
                .toUri();
        return ResponseEntity.created(location).body(photo);
    }

    // Orden cronológico (la más antigua primero). ?page (desde 0) y ?size (máximo 100); el sort se ignora
    @GetMapping
    public PageResponse<ProgressPhotoResponse> findByAthlete(@AuthenticationPrincipal Jwt jwt,
                                                             @PathVariable UUID athleteId,
                                                             @ParameterObject @PageableDefault(size = 20)
                                                             Pageable pageable) {
        return progressPhotoService.findByAthlete(AuthenticatedUser.from(jwt), athleteId, pageable);
    }

    // Foto con una URL firmada nueva: la usa el frontend cuando la URL venció
    @GetMapping("/{photoId}")
    public ProgressPhotoResponse findOne(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                         @PathVariable UUID photoId) {
        return progressPhotoService.findOne(AuthenticatedUser.from(jwt), athleteId, photoId);
    }

    // Borra la fila y el objeto del bucket. 204 sin body; una segunda vez responde 404
    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId, @PathVariable UUID photoId) {
        progressPhotoService.delete(AuthenticatedUser.from(jwt), athleteId, photoId);
    }
}
