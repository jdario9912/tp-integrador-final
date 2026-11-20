package com.gestion_deportiva.api.measurement.dto;

import com.gestion_deportiva.api.measurement.validation.UniqueBodyMeasurementValues;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

// Alta y edición de un registro de medidas (US-45, mismo body en POST y PUT, contrato 17.4). Sin athleteId: sale de la
// ruta. Que la fecha no sea futura lo valida BodyMeasurementService con el reloj y la zona de la app (como el peso)
@UniqueBodyMeasurementValues
public record BodyMeasurementRecordRequest(

        @NotNull(message = "La fecha es obligatoria")
        LocalDate date,

        // Se cuenta lo que llega, antes de recortar los espacios; vacío o solo espacios se guarda null
        @Size(max = 500, message = "El comentario no puede superar los 500 caracteres")
        String comment,

        // Al menos una medida. En el PUT reemplaza la lista completa del registro
        @NotEmpty(message = "Indique al menos una medida")
        List<@NotNull(message = "La medida no puede estar vacía") @Valid BodyMeasurementValueRequest> values
) {
}
