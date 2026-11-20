package com.gestion_deportiva.api.measurement.validation;

import com.gestion_deportiva.api.measurement.dto.BodyMeasurementRecordRequest;
import com.gestion_deportiva.api.measurement.dto.BodyMeasurementValueRequest;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import com.gestion_deportiva.api.measurement.model.enums.MeasurementSide;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

public class UniqueBodyMeasurementValuesValidator
        implements ConstraintValidator<UniqueBodyMeasurementValues, BodyMeasurementRecordRequest> {

    // Clave de una medida dentro del registro: el tipo y el lado (null en las no bilaterales)
    private record TypeAndSide(BodyMeasurementType type, MeasurementSide side) {
    }

    // Las medidas incompletas (null) las informan sus propias restricciones: acá solo se comparan las completas
    @Override
    public boolean isValid(BodyMeasurementRecordRequest request, ConstraintValidatorContext context) {
        if (request == null || request.values() == null) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        if (hasRepeatedType(request.values())) {
            context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                    .addPropertyNode("values")
                    .addConstraintViolation();
            return false;
        }
        return true;
    }

    private static boolean hasRepeatedType(List<BodyMeasurementValueRequest> values) {
        Set<TypeAndSide> seen = new HashSet<>();
        return values.stream()
                .filter(Objects::nonNull)
                .filter(value -> value.type() != null)
                .map(value -> new TypeAndSide(value.type(), value.side()))
                .anyMatch(key -> !seen.add(key));
    }
}
