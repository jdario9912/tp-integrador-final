package com.gestion_deportiva.api.weight.repository;

import com.gestion_deportiva.api.weight.model.WeightRecord;
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

import static com.gestion_deportiva.api.weight.repository.WeightRecordSpecifications.belongsToAthlete;
import static com.gestion_deportiva.api.weight.repository.WeightRecordSpecifications.recordedOnOrAfter;
import static com.gestion_deportiva.api.weight.repository.WeightRecordSpecifications.recordedOnOrBefore;

// JpaSpecificationExecutor: listado paginado del atleta con rango de fechas opcional (US-26)
public interface WeightRecordRepository extends JpaRepository<WeightRecord, UUID>,
        JpaSpecificationExecutor<WeightRecord> {

    // Orden fijo del listado: del más reciente al más antiguo. Hay un registro por día, así que no hay empates
    Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "recordedOn");

    // Día ocupado (ux_weight_records_athlete_recorded_on)
    boolean existsByAthleteIdAndRecordedOn(UUID athleteId, LocalDate recordedOn);

    // El registro solo si es de ese atleta: el de otro atleta responde igual que uno inexistente (404)
    Optional<WeightRecord> findByIdAndAthleteId(UUID id, UUID athleteId);

    // Registros del atleta entre from y to (opcionales e inclusivos), del más reciente al más antiguo.
    // Toma la página y el tamaño pedidos e ignora el sort del cliente. Método default: Spring Data no lo
    // interpreta como consulta derivada
    default Page<WeightRecord> findNewestFirst(UUID athleteId, LocalDate from, LocalDate to, Pageable pageable) {
        Specification<WeightRecord> spec = Specification.allOf(
                belongsToAthlete(athleteId),
                recordedOnOrAfter(from),
                recordedOnOrBefore(to));
        return findAll(spec, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), NEWEST_FIRST));
    }
}
