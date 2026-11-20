package com.gestion_deportiva.api.measurement.service;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.config.TimeZoneProperties;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordRequest;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordResponse;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementSearchFilter;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementValueRequest;
import com.gestion_deportiva.api.measurement.exception.BodyMeasurementRecordAlreadyExistsException;
import com.gestion_deportiva.api.measurement.exception.BodyMeasurementRecordNotFoundException;
import com.gestion_deportiva.api.measurement.exception.FutureBodyMeasurementDateException;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import com.gestion_deportiva.api.measurement.repository.BodyMeasurementRecordRepository;
import com.gestion_deportiva.api.measurement.repository.BodyMeasurementValueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

// Orden de evaluación del contrato (17.8): validación (incluida la fecha futura) → atleta inexistente (404) →
// pertenencia (403) → registro inexistente (404, solo PUT) → día ocupado (409)
@Service
@RequiredArgsConstructor
public class BodyMeasurementServiceImpl implements BodyMeasurementService {

    private final BodyMeasurementRecordRepository recordRepository;
    private final BodyMeasurementValueRepository valueRepository;
    private final AthleteRepository athleteRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final Clock clock;
    private final TimeZoneProperties timeZoneProperties;

    @Override
    @Transactional
    public BodyMeasurementRecordResponse create(AuthenticatedUser user, UUID athleteId,
                                                BodyMeasurementRecordRequest request) {
        requireNotFuture(request.date());
        athleteAccessGuard.verifyAccess(user, athleteId);

        if (recordRepository.existsByAthleteIdAndMeasuredOn(athleteId, request.date())) {
            throw new BodyMeasurementRecordAlreadyExistsException(request.date());
        }

        // El guard ya comprobó que el atleta existe: alcanza con la referencia (no consulta la base)
        Athlete athlete = athleteRepository.getReferenceById(athleteId);
        BodyMeasurementRecord record = new BodyMeasurementRecord(athlete, request.date(), request.comment(),
                clock.instant());

        // saveAndFlush ejecuta el INSERT acá: una carrera contra la restricción única sale como 409 (GlobalExceptionHandler)
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(record);
        List<BodyMeasurementValue> measurements = valueRepository.saveAllAndFlush(toValues(saved, request.values()));
        return BodyMeasurementRecordResponse.from(saved, measurements);
    }

    // Edición completa: reemplaza fecha, comentario y la lista de medidas
    @Override
    @Transactional
    public BodyMeasurementRecordResponse update(AuthenticatedUser user, UUID athleteId, UUID recordId,
                                                BodyMeasurementRecordRequest request) {
        requireNotFuture(request.date());
        athleteAccessGuard.verifyAccess(user, athleteId);

        // Después de la pertenencia: solo el dueño puede saber si un id de registro existe
        BodyMeasurementRecord record = recordRepository.findByIdAndAthleteId(recordId, athleteId)
                .orElseThrow(() -> new BodyMeasurementRecordNotFoundException(recordId));

        // Solo se consulta si cambia la fecha: la del propio registro no es un conflicto
        if (!request.date().equals(record.getMeasuredOn())
                && recordRepository.existsByAthleteIdAndMeasuredOn(athleteId, request.date())) {
            throw new BodyMeasurementRecordAlreadyExistsException(request.date());
        }

        record.correct(request.date(), request.comment(), clock.instant());
        BodyMeasurementRecord saved = recordRepository.saveAndFlush(record);

        // La lista nueva reemplaza a la anterior: se borra la actual y se insertan las nuevas
        valueRepository.deleteByRecordId(recordId);
        List<BodyMeasurementValue> measurements = valueRepository.saveAllAndFlush(toValues(saved, request.values()));
        return BodyMeasurementRecordResponse.from(saved, measurements);
    }

    // Del más reciente al más antiguo, con rango opcional. Las medidas de la página salen en una sola consulta
    @Override
    @Transactional(readOnly = true)
    public PageResponse<BodyMeasurementRecordResponse> findByAthlete(AuthenticatedUser user, UUID athleteId,
                                                                     BodyMeasurementSearchFilter filter,
                                                                     Pageable pageable) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        Page<BodyMeasurementRecord> page = recordRepository.findNewestFirst(athleteId, filter.from(), filter.to(),
                pageable);
        Map<UUID, List<BodyMeasurementValue>> measurementsByRecord = measurementsOf(page.getContent());
        return PageResponse.from(page.map(record -> BodyMeasurementRecordResponse.from(record,
                measurementsByRecord.getOrDefault(record.getId(), List.of()))));
    }

    private Map<UUID, List<BodyMeasurementValue>> measurementsOf(Collection<BodyMeasurementRecord> records) {
        if (records.isEmpty()) {
            return Map.of();
        }
        List<UUID> recordIds = records.stream().map(BodyMeasurementRecord::getId).toList();
        return valueRepository.findByRecordIdIn(recordIds).stream()
                .collect(Collectors.groupingBy(value -> value.getRecord().getId()));
    }

    private static List<BodyMeasurementValue> toValues(BodyMeasurementRecord record,
                                                       List<BodyMeasurementValueRequest> requests) {
        return requests.stream()
                .map(request -> new BodyMeasurementValue(record, request.type(), request.side(), request.value()))
                .toList();
    }

    // Se valida antes que el atleta (paso 3 del contrato): es un 400 de validación y no revela nada del atleta
    private void requireNotFuture(LocalDate date) {
        if (date.isAfter(today())) {
            throw new FutureBodyMeasurementDateException();
        }
    }

    // "Hoy" en la zona de la app y no en UTC: entre las 21:00 y las 23:59 de Argentina, en UTC ya es mañana
    private LocalDate today() {
        return LocalDate.now(clock.withZone(timeZoneProperties.zoneId()));
    }
}
