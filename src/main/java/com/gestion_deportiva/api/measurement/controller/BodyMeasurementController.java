package com.gestion_deportiva.api.measurement.controller;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordRequest;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordResponse;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementSearchFilter;
import com.gestion_deportiva.api.measurement.service.BodyMeasurementService;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

// Registros de medidas corporales del atleta (US-45). Alta y edición solo ATHLETE; listado COACH y ATHLETE (reglas en
// SecurityConfig). Qué atleta puede usar cada uno lo decide BodyMeasurementServiceImpl con AthleteAccessGuard
@RestController
@RequestMapping("/athletes/{athleteId}/measurements")
@RequiredArgsConstructor
public class BodyMeasurementController {

    private final BodyMeasurementService bodyMeasurementService;

    // Un registro por día: si la fecha ya tiene uno, 409. Sin Location: no hay un GET de un registro individual (17.5)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BodyMeasurementRecordResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                                @Valid @RequestBody BodyMeasurementRecordRequest request) {
        return bodyMeasurementService.create(AuthenticatedUser.from(jwt), athleteId, request);
    }

    // Edición completa: reemplaza fecha, comentario y medidas. El de otro atleta responde 404
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Registro corregido"),
            @ApiResponse(responseCode = "400", description = "Body inválido o fecha futura"),
            @ApiResponse(responseCode = "403", description = "Solo el atleta puede corregir sus medidas"),
            @ApiResponse(responseCode = "404", description = "El registro no existe o es de otro atleta"),
            @ApiResponse(responseCode = "409", description = "Ya hay un registro de medidas en esa fecha")
    })
    @PutMapping("/{recordId}")
    public BodyMeasurementRecordResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID athleteId,
                                                @PathVariable UUID recordId,
                                                @Valid @RequestBody BodyMeasurementRecordRequest request) {
        return bodyMeasurementService.update(AuthenticatedUser.from(jwt), athleteId, recordId, request);
    }

    // Del más reciente al más antiguo. ?from y ?to (YYYY-MM-DD, inclusivos) son opcionales; ?page y ?size (máximo 100)
    // @ParameterObject: Swagger documenta cada query param por separado
    @GetMapping
    public PageResponse<BodyMeasurementRecordResponse> findByAthlete(@AuthenticationPrincipal Jwt jwt,
                                                                     @PathVariable UUID athleteId,
                                                                     @ParameterObject @Valid
                                                                     BodyMeasurementSearchFilter filter,
                                                                     @ParameterObject @PageableDefault(size = 20)
                                                                     Pageable pageable) {
        return bodyMeasurementService.findByAthlete(AuthenticatedUser.from(jwt), athleteId, filter, pageable);
    }
}
