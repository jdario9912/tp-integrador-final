package com.gestion_deportiva.api.weight.service;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.weight.dto.WeightRecordRequest;
import com.gestion_deportiva.api.weight.dto.WeightRecordResponse;
import com.gestion_deportiva.api.weight.dto.WeightRecordSearchFilter;
import com.gestion_deportiva.api.weight.exception.FutureWeightRecordDateException;
import com.gestion_deportiva.api.weight.exception.WeightRecordAlreadyExistsException;
import com.gestion_deportiva.api.weight.exception.WeightRecordNotFoundException;
import com.gestion_deportiva.api.weight.model.WeightRecord;
import com.gestion_deportiva.api.weight.repository.WeightRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

// Registros de peso del atleta (US-26). La regla de rol (alta y edición solo ATHLETE) vive en SecurityConfig;
// la pertenencia, acá con AthleteAccessGuard. Orden de evaluación del contrato (8.9): validación (incluida la
// fecha futura) → atleta inexistente (404) → pertenencia (403) → registro inexistente (404) → día ocupado (409)
@Service
@RequiredArgsConstructor
public class WeightRecordService {

    private final WeightRecordRepository weightRecordRepository;
    private final AthleteRepository athleteRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final Clock clock;
    private final TimeZoneProperties timeZoneProperties;

    @Transactional
    public WeightRecordResponse create(AuthenticatedUser user, UUID athleteId, WeightRecordRequest request) {
        requireNotFuture(request.date());
        athleteAccessGuard.verifyAccess(user, athleteId);

        if (weightRecordRepository.existsByAthleteIdAndRecordedOn(athleteId, request.date())) {
            throw new WeightRecordAlreadyExistsException(request.date());
        }

        // El guard ya comprobó que el atleta existe: alcanza con la referencia (no consulta la base)
        Athlete athlete = athleteRepository.getReferenceById(athleteId);
        WeightRecord weightRecord = new WeightRecord(athlete, request.date(), request.weightKg(), request.comment(),
                clock.instant());

        // saveAndFlush ejecuta el INSERT acá: si dos altas simultáneas chocan contra el índice único del día, la
        // DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler (409)
        return WeightRecordResponse.from(weightRecordRepository.saveAndFlush(weightRecord));
    }

    // Edición completa: reemplaza fecha, peso y comentario (el que no viene queda en null)
    @Transactional
    public WeightRecordResponse update(AuthenticatedUser user, UUID athleteId, UUID weightId,
                                       WeightRecordRequest request) {
        requireNotFuture(request.date());
        athleteAccessGuard.verifyAccess(user, athleteId);

        // Después de la pertenencia: solo el dueño puede saber si un id de registro existe
        WeightRecord weightRecord = weightRecordRepository.findByIdAndAthleteId(weightId, athleteId)
                .orElseThrow(() -> new WeightRecordNotFoundException(weightId));

        // Solo se consulta si cambia la fecha: la del propio registro no es un conflicto
        if (!request.date().equals(weightRecord.getRecordedOn())
                && weightRecordRepository.existsByAthleteIdAndRecordedOn(athleteId, request.date())) {
            throw new WeightRecordAlreadyExistsException(request.date());
        }

        weightRecord.correct(request.date(), request.weightKg(), request.comment(), clock.instant());

        // saveAndFlush: igual que en create, una carrera contra el índice único sale como 409
        return WeightRecordResponse.from(weightRecordRepository.saveAndFlush(weightRecord));
    }

    // Del más reciente al más antiguo, con rango opcional (from <= to lo valida el filtro)
    @Transactional(readOnly = true)
    public PageResponse<WeightRecordResponse> findByAthlete(AuthenticatedUser user, UUID athleteId,
                                                            WeightRecordSearchFilter filter, Pageable pageable) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        return PageResponse.from(weightRecordRepository
                .findNewestFirst(athleteId, filter.from(), filter.to(), pageable)
                .map(WeightRecordResponse::from));
    }

    // Se valida antes que el atleta (paso 3 del contrato): es un 400 de validación y no revela nada del atleta
    private void requireNotFuture(LocalDate date) {
        if (date.isAfter(today())) {
            throw new FutureWeightRecordDateException();
        }
    }

    // "Hoy" en la zona de la app y no en UTC: entre las 21:00 y las 23:59 de Argentina, en UTC ya es mañana
    private LocalDate today() {
        return LocalDate.now(clock.withZone(timeZoneProperties.zoneId()));
    }
}
