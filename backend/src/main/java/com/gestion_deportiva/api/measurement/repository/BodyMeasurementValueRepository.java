package com.gestion_deportiva.api.measurement.repository;

import com.gestion_deportiva.api.measurement.model.BodyMeasurementValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BodyMeasurementValueRepository extends JpaRepository<BodyMeasurementValue, UUID> {

    // Las medidas de varios registros en una sola consulta: el listado no hace una consulta por registro (sin N+1)
    List<BodyMeasurementValue> findByRecordIdIn(Collection<UUID> recordIds);

    // Reemplazo de la lista en la edición (PUT): borra las medidas actuales del registro. Es un DELETE masivo, así que
    // se ejecuta ya y no al hacer flush; el service inserta la lista nueva después
    @Modifying
    @Query("delete from BodyMeasurementValue v where v.record.id = :recordId")
    void deleteByRecordId(@Param("recordId") UUID recordId);
}
