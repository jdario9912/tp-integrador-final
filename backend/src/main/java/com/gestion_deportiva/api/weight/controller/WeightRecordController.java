package com.gestion_deportiva.api.weight.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.weight.dto.WeightRecordRequest;
import com.gestion_deportiva.api.weight.dto.WeightRecordResponse;
import com.gestion_deportiva.api.weight.dto.WeightRecordSearchFilter;
import com.gestion_deportiva.api.weight.service.WeightRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// Registros de peso del atleta (US-26). Alta y edición solo ATHLETE; listado COACH y ATHLETE (reglas en
// SecurityConfig). Qué atleta puede usar cada uno lo decide WeightRecordService con AthleteAccessGuard
@RestController
@RequestMapping("/athletes/{athleteId}/weights")
@RequiredArgsConstructor
public class WeightRecordController {

    private final WeightRecordService weightRecordService;

    // Un registro por día: si la fecha ya tiene uno, 409. Sin header Location: no hay un GET de un registro
    // individual (contrato 8.4). @ResponseStatus fija el 201 y lo documenta en Swagger
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WeightRecordResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                       @Valid @RequestBody WeightRecordRequest request) {
        return weightRecordService.create(AuthenticatedUser.from(jwt), athleteId, request);
    }

    // Edición completa (los registros no se borran: se corrigen). El de otro atleta responde 404
    @PutMapping("/{weightId}")
    public WeightRecordResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                       @PathVariable UUID weightId,
                                       @Valid @RequestBody WeightRecordRequest request) {
        return weightRecordService.update(AuthenticatedUser.from(jwt), athleteId, weightId, request);
    }

    // Del más reciente al más antiguo. ?from y ?to (YYYY-MM-DD, inclusivos) son opcionales; ?page (desde 0) y
    // ?size (máximo 100). Con ?size=1, el último peso (ficha del entrenador).
    // @ParameterObject: Swagger documenta cada query param por separado y no como un objeto
    @GetMapping
    public PageResponse<WeightRecordResponse> findByAthlete(@AuthenticationPrincipal Jwt jwt,
                                                            @PathVariable UUID athleteId,
                                                            @ParameterObject @Valid WeightRecordSearchFilter filter,
                                                            @ParameterObject @PageableDefault(size = 20)
                                                            Pageable pageable) {
        return weightRecordService.findByAthlete(AuthenticatedUser.from(jwt), athleteId, filter, pageable);
    }
}
