package com.gestion_deportiva.api.measurement.controller;

import com.gestion_deportiva.api.measurement.dto.BodyMeasurementTypeResponse;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

// Catálogo de medidas corporales (US-45, contrato 17.2): el front arma los campos desde acá (nombre, unidad, lados y
// rango). Catálogo fijo: se lee del enum, que CatalogSchemaTest mantiene igual a la tabla body_measurement_types
@RestController
@RequestMapping("/body-measurement-types")
public class BodyMeasurementTypeController {

    private static final List<BodyMeasurementTypeResponse> BODY_MEASUREMENT_TYPES = Arrays.stream(
                    BodyMeasurementType.values())
            .map(BodyMeasurementTypeResponse::from)
            .toList();

    @GetMapping
    public List<BodyMeasurementTypeResponse> findAll() {
        return BODY_MEASUREMENT_TYPES;
    }
}
