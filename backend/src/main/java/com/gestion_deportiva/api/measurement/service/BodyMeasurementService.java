package com.gestion_deportiva.api.measurement.service;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordRequest;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordResponse;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementSearchFilter;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

// Registros de medidas corporales del atleta (US-45). La regla de rol (alta y edición solo ATHLETE) vive en
// SecurityConfig; la pertenencia, en AthleteAccessGuard, dentro de la implementación
public interface BodyMeasurementService {

    BodyMeasurementRecordResponse create(AuthenticatedUser user, UUID athleteId, BodyMeasurementRecordRequest request);

    BodyMeasurementRecordResponse update(AuthenticatedUser user, UUID athleteId, UUID recordId,
                                         BodyMeasurementRecordRequest request);

    PageResponse<BodyMeasurementRecordResponse> findByAthlete(AuthenticatedUser user, UUID athleteId,
                                                              BodyMeasurementSearchFilter filter, Pageable pageable);
}
