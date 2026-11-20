package com.gestion_deportiva.api.measurement.repository;

import com.gestion_deportiva.api.measurement.model.BodyMeasurementRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.measurement.repository.BodyMeasurementRecordSpecifications.belongsToAthlete;
import static com.gestion_deportiva.api.measurement.repository.BodyMeasurementRecordSpecifications.measuredOnOrAfter;
import static com.gestion_deportiva.api.measurement.repository.BodyMeasurementRecordSpecifications.measuredOnOrBefore;

// JpaSpecificationExecutor: listado paginado del atleta con rango de fechas opcional (US-45)
public interface BodyMeasurementRecordRepository extends JpaRepository<BodyMeasurementRecord, UUID>,
        JpaSpecificationExecutor<BodyMeasurementRecord> {

    // Orden fijo del listado: del más reciente al más antiguo. Hay un registro por día, así que no hay empates
    Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "measuredOn");

    // Día ocupado (ux_body_measurement_records_athlete_measured_on)
    boolean existsByAthleteIdAndMeasuredOn(UUID athleteId, LocalDate measuredOn);

    // El registro solo si es de ese atleta: el de otro atleta responde igual que uno inexistente (404)
    Optional<BodyMeasurementRecord> findByIdAndAthleteId(UUID id, UUID athleteId);

    // Registros del atleta entre from y to (opcionales e inclusivos), del más reciente al más antiguo. Toma la página
    // y el tamaño pedidos e ignora el sort del cliente. Método default: Spring Data no lo interpreta como consulta
    default Page<BodyMeasurementRecord> findNewestFirst(UUID athleteId, LocalDate from, LocalDate to,
                                                        Pageable pageable) {
        Specification<BodyMeasurementRecord> spec = Specification.allOf(
                belongsToAthlete(athleteId),
                measuredOnOrAfter(from),
                measuredOnOrBefore(to));
        return findAll(spec, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), NEWEST_FIRST));
    }
}
